import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { retrieveHybridChunks } from '@/lib/hybrid-retriever';
import { validateInputQuery, verifyAnswerGrounding } from '@/lib/guardrails';
import { withRetry } from '@/lib/openai-retry';
import { authorizeNotebookAccess } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { notebookId, message, activeSourceIds } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const { userId, notebook, errorResponse } = await authorizeNotebookAccess(notebookId);
    if (errorResponse) return errorResponse;

    // 0. CHECK IF ACTIVE SOURCES IS AN EMPTY ARRAY
    if (Array.isArray(activeSourceIds) && activeSourceIds.length === 0) {
      return NextResponse.json({
        answer: 'No active sources selected. Please check at least 1 source in Knowledge Vault to ask questions.',
        citations: [],
      });
    }

    // 1. INPUT GUARDRAIL CHECK
    const guardrail = validateInputQuery(message);
    if (!guardrail.allowed) {
      return NextResponse.json({
        answer: `⚠️ ${guardrail.reason}`,
        citations: [],
      });
    }

    const queryText = guardrail.sanitizedQuery || message;

    // 2. HYBRID MIX RETRIEVAL (filtered directly by activeSourceIds in Qdrant)
    let retrievedChunks = await retrieveHybridChunks(notebookId, queryText, 5, activeSourceIds);

    if (Array.isArray(activeSourceIds) && activeSourceIds.length > 0) {
      retrievedChunks = retrievedChunks.filter((c) => activeSourceIds.includes(c.sourceId));
    }

    if (retrievedChunks.length === 0) {
      return NextResponse.json({
        answer: 'No relevant information found in the active notebook sources to answer your question.',
        citations: [],
      });
    }

    // 3. CONTEXT ASSEMBLY
    const contextText = retrievedChunks
      .map(
        (chunk, idx) =>
          `[Citation ${idx + 1}] (Source: "${chunk.sourceTitle}", Type: ${chunk.sourceType}, Page: ${
            chunk.pageNumber || 'N/A'
          }, Timestamp: ${chunk.startTime ? `${chunk.startTime}s` : 'N/A'}):\n"${chunk.text}"`
      )
      .join('\n\n');

    const isFlashcardQuery = /\b(flashcard|flashcards|flash card|flash cards|study card|study cards|recall card|recall cards)\b/i.test(message);

    let systemPrompt = `You are SynthMind, an expert AI research assistant.
Answer the user's question STRICTLY based on the provided context sources below.
Rules:
1. Every major statement or fact MUST include numerical citation badges corresponding to the context sources, e.g., [1], [2].
2. Do NOT use external knowledge or hallucinate facts not present in the sources.
3. If the context does not contain enough information to answer, state clearly what is missing.`;

    if (isFlashcardQuery) {
      systemPrompt += `\n4. FORMAT REQUIREMENT: Since the user requested flashcards, format your output strictly as interactive flashcards using this format:

Flashcard 1
Front: Question or key concept
Back: Detailed answer or explanation grounded in context
Citation: [1]

Flashcard 2
Front: Question or key concept
Back: Detailed answer or explanation grounded in context
Citation: [2]`;
    }

    systemPrompt += `\n\nCONTEXT SOURCES:\n${contextText}`;

    const candidateCitations = retrievedChunks.map((c, i) => ({
      id: i + 1,
      sourceId: c.sourceId,
      sourceTitle: c.sourceTitle,
      sourceType: c.sourceType,
      pageNumber: c.pageNumber,
      startTime: c.startTime,
      textSnippet: c.text,
      videoId: (c as any).videoId,
      urlOrPath: (c as any).urlOrPath,
    }));

    if (!process.env.OPENAI_API_KEY) {
      const topChunk = retrievedChunks[0];
      const answer = `According to [1], ${topChunk.text.slice(0, 300)}...`;
      // Persist mock response too
      await db.chatMessage.createMany({
        data: [
          { notebookId, userId, role: 'user', content: message },
          { notebookId, userId, role: 'assistant', content: answer, citationsJson: JSON.stringify(candidateCitations) },
        ],
      });
      return NextResponse.json({ answer, citations: candidateCitations });
    }

    // 4. LLM COMPLETION CALL (with retry)
    let completion = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: queryText },
        ],
        temperature: 0.2,
      })
    );

    let answer = completion.choices[0]?.message?.content || 'Unable to generate answer.';

    // 5. OUTPUT GUARDRAIL CHECK & RETRY
    const outputVerification = verifyAnswerGrounding(answer, candidateCitations);
    if (!outputVerification.isValid && candidateCitations.length > 0) {
      completion = await withRetry(() =>
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: queryText },
            { role: 'assistant', content: answer },
            {
              role: 'user',
              content:
                'RE-TRY NOTICE: Ensure EVERY factual statement includes numerical citation badges [1], [2] referencing the context sources above.',
            },
          ],
          temperature: 0.1,
        })
      );
      answer = completion.choices[0]?.message?.content || answer;
    }

    // 6. FILTER CITATIONS: Only keep citations that were ACTUALLY referenced by number [1], [2] in the answer text
    const usedCitationIds = new Set<number>();
    const matches = answer.matchAll(/\[(\d+)\]/g);
    for (const match of matches) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id)) usedCitationIds.add(id);
    }

    const finalCitations = candidateCitations.filter((c) => usedCitationIds.has(c.id));

    // 7. PERSIST user + assistant messages to DB (fire-and-forget — does not block response)
    db.chatMessage
      .createMany({
        data: [
          { notebookId, userId, role: 'user', content: message },
          { notebookId, userId, role: 'assistant', content: answer, citationsJson: JSON.stringify(finalCitations) },
        ],
      })
      .catch((err) => console.error('Failed to persist chat messages:', err));

    return NextResponse.json({ answer, citations: finalCitations });
  } catch (error: any) {
    console.error('POST /api/rag/chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
