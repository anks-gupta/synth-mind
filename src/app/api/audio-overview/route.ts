import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { retrieveHybridChunks } from '@/lib/hybrid-retriever';
import { withRetry } from '@/lib/openai-retry';
import { authorizeNotebookAccess } from '@/lib/auth-helpers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
});

export const dynamic = 'force-dynamic';

export interface AudioTurn {
  host: 'A' | 'B';
  name: string;
  text: string;
  topicTag?: string;
}

export interface AudioOverviewResponse {
  title: string;
  summary: string;
  turns: AudioTurn[];
  sourceCount: number;
}

export async function POST(req: Request) {
  try {
    const { notebookId, activeSourceIds, length = 'medium' } = await req.json();

    const { notebook, errorResponse } = await authorizeNotebookAccess(notebookId);
    if (errorResponse) return errorResponse;

    if (Array.isArray(activeSourceIds) && activeSourceIds.length === 0) {
      return NextResponse.json({ error: 'No active sources selected.' }, { status: 400 });
    }

    let readySources = notebook.sources.filter((s: any) => s.status === 'ready');
    if (activeSourceIds && Array.isArray(activeSourceIds) && activeSourceIds.length > 0) {
      readySources = readySources.filter((s: any) => activeSourceIds.includes(s.id));
    }

    if (readySources.length === 0) {
      return NextResponse.json({ error: 'No ready active sources found.' }, { status: 400 });
    }

    // Retrieve relevant chunks from RAG for richer context
    const keyTopics = ['key concepts', 'main ideas', 'summary', 'important takeaways'];
    const allChunks: string[] = [];

    for (const topic of keyTopics) {
      try {
        const chunks = await retrieveHybridChunks(notebookId, topic, 3);
        const filtered = activeSourceIds?.length
          ? chunks.filter((c) => activeSourceIds.includes(c.sourceId))
          : chunks;
        filtered.forEach((c) => {
          if (c.text && !allChunks.includes(c.text)) {
            allChunks.push(c.text.slice(0, 400));
          }
        });
      } catch {
        // ignore retrieval errors per topic
      }
    }

    const sourceList = readySources.map((s: any) => `"${s.title}" (${s.type})`).join(', ');
    const contextSnippet = allChunks.slice(0, 10).join('\n\n---\n\n');

    if (!process.env.OPENAI_API_KEY) {
      // Mock fallback
      const mockTurns: AudioTurn[] = [
        { host: 'A', name: 'Alex', text: `Welcome back to the studio! Today we're unpacking some fascinating material from our active sources: ${sourceList}.`, topicTag: 'Warm-Up' },
        { host: 'B', name: 'Blake', text: `I've been digging through these all morning, and honestly, there's one core idea that completely flipped my perspective.`, topicTag: 'Warm-Up' },
        { host: 'A', name: 'Alex', text: `Wait, really? Which one? Because when I looked at the architecture, it felt surprisingly straightforward once you see how the pieces fit.`, topicTag: 'The Core Breakdown' },
        { host: 'B', name: 'Blake', text: `Think of it like building with Lego blocks. You start with foundational components, and suddenly complex workflows just fall into place naturally.`, topicTag: 'The Core Breakdown' },
        { host: 'A', name: 'Alex', text: `Hold on, let that sink in. So instead of over-engineering the system, you're just relying on smart modular design?`, topicTag: 'Lightbulb Moment' },
        { host: 'B', name: 'Blake', text: `Exactly! That's the real magic here. It saves massive overhead and makes troubleshooting almost effortless.`, topicTag: 'Lightbulb Moment' },
        { host: 'A', name: 'Alex', text: `That's wild. What's the single biggest takeaway for anyone diving into this material right now?`, topicTag: 'Real-World Impact' },
        { host: 'B', name: 'Blake', text: `Focus on mastering the fundamentals first. The advanced techniques will make ten times more sense once the core concept is solid.`, topicTag: 'Key Takeaway' },
        { host: 'A', name: 'Alex', text: `Spot on. That wraps up today's deep dive — thanks for tuning in, and keep building!`, topicTag: 'Wrap-Up' },
        { host: 'B', name: 'Blake', text: `Catch you all in the next episode!`, topicTag: 'Wrap-Up' },
      ];
      return NextResponse.json({
        title: `${notebook.title} – Audio Deep Dive`,
        summary: `An engaging conversational breakdown of your ${readySources.length} active knowledge sources.`,
        turns: mockTurns,
        sourceCount: readySources.length,
      } as AudioOverviewResponse);
    }

    const lengthInstruction = {
      short: 'Write 4 to 6 concise back-and-forth turns (~1-2 minutes) covering high-level takeaways.',
      medium: 'Write 8 to 10 engaging back-and-forth turns (~3-4 minutes) covering core takeaways & technical nuances.',
      long: 'Write 12 to 16 in-depth back-and-forth turns (~5-8 minutes) with comprehensive breakdowns, analogies, and detailed analysis.',
    }[(length as 'short' | 'medium' | 'long') || 'medium'];

    const prompt = `You are a world-class podcast producer scripting an engaging, highly entertaining, and insightful tech/learning podcast episode between two human co-hosts:
- Host A: Alex (curious, energetic host who asks sharp questions and connects ideas to real-life situations).
- Host B: Blake (witty, analytical expert who breaks down complex technical details with fun analogies and memorable takeaways).

They are discussing the following active knowledge sources: ${sourceList}.

CONTEXT FROM SOURCES:
${contextSnippet || 'No additional context snippet available — discuss based on source titles.'}

STRICT PODCAST STYLE & HUMAN DIALOGUE RULES:
1. SOUND LIKE REAL HUMANS: Use natural spoken conversational flow, lively banter, genuine curiosity, light humor, and relatable everyday analogies.
2. DO NOT REPEAT NAMES CONSTANTLY: Never start every turn with "Well Alex..." or "You know Blake...". Real people talk naturally without incessantly saying each other's names! Mention a name at most ONCE or TWICE in the whole episode.
3. USE NATURAL SPOKEN TRANSITIONS: Include realistic vocal expressions and conversational hooks (e.g. "Wait, really?", "Hold on, let that sink in...", "Oh that's wild!", "Exactly.", "Here's the cool part...").
4. ZERO ROBOTIC JARGON OR GENERIC FILLER: Discuss SPECIFIC concepts, mechanics, and techniques mentioned in the context. Explain WHY it matters.
5. LENGTH & STRUCTURE: ${lengthInstruction} Each turn must be 1 to 3 natural spoken sentences.
6. TOPIC TAGS: Group turns into logical podcast segments using topicTag (e.g. "Warm-Up", "The Core Breakdown", "Lightbulb Moment", "Real-World Impact", "Key Takeaway").

Return ONLY valid JSON matching this schema:
{
  "title": "${notebook.title} – Audio Deep Dive",
  "summary": "Catchy 1-sentence episode description highlighting the main theme.",
  "turns": [
    { "host": "A", "name": "Alex", "text": "...", "topicTag": "Warm-Up" },
    { "host": "B", "name": "Blake", "text": "...", "topicTag": "Warm-Up" }
  ]
}`;

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      })
    );

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      title: parsed.title || `${notebook.title} Audio Overview`,
      summary: parsed.summary || '',
      turns: parsed.turns || [],
      sourceCount: readySources.length,
    } as AudioOverviewResponse);
  } catch (error: any) {
    console.error('POST /api/audio-overview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
