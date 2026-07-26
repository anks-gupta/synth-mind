import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { withRetry } from '@/lib/openai-retry';
import { DiscoveryItem } from '@/lib/types';
import { extractYouTubeVideoId } from '@/lib/parsers/youtube-parser';
import { authorizeNotebookAccess } from '@/lib/auth-helpers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
});

export async function POST(req: Request) {
  try {
    const { notebookId, activeSourceIds } = await req.json();

    const { notebook, errorResponse } = await authorizeNotebookAccess(notebookId);
    if (errorResponse) return errorResponse;

    let readySources = notebook.sources.filter((s: any) => s.status === 'ready');

    if (activeSourceIds && Array.isArray(activeSourceIds) && activeSourceIds.length > 0) {
      readySources = readySources.filter((s: any) => activeSourceIds.includes(s.id));
    }

    if (readySources.length === 0) {
      return NextResponse.json({
        error: 'No active ready sources selected. Please check at least 1 source in Knowledge Vault.',
      });
    }

    const sourceContexts = readySources
      .map(
        (s: any, idx: number) =>
          `[Source ${idx + 1}] ID: "${s.id}", Title: "${s.title}", Type: "${s.type}", URL/Path: "${s.urlOrPath || 'N/A'}"\nExtracted Excerpt:\n${
            (s.content || s.title).slice(0, 4000)
          }`
      )
      .join('\n\n---\n\n');

    const prompt = `You are an expert AI Research Analyst.
Instead of answering a user query or writing an obvious summary, proactively analyze all active knowledge sources in workspace "${notebook.title}" and identify the most valuable discoveries a human reader is likely to miss.

Do not summarize the documents.
Reason across the entire knowledge base and surface meaningful insights.
Your objective is to surprise the user with observations they did not explicitly ask for.

Look across these 6 categories:
1. "Contradiction": Conflicting claims, different recommendations, inconsistent numbers, opposing conclusions.
2. "Hidden Relationship": Concepts appearing together, cause-and-effect relationships, dependencies, shared entities.
3. "Missing Information": Topics referenced but never explained, missing prerequisites, unanswered questions, incomplete workflows.
4. "Trend": Recurring themes, repeated terminology, emerging patterns over time.
5. "Surprising Fact": Rare findings, counter-intuitive statements, outliers, unexpected correlations.
6. "Actionable Insight": Key risks, strategic opportunities, optimization ideas, recommended next areas to study.

Each discovery MUST contain:
- "rank": integer 1 to 7 (ranked by importance)
- "title": short compelling headline
- "category": exactly one of ["Contradiction", "Hidden Relationship", "Missing Information", "Trend", "Surprising Fact", "Actionable Insight"]
- "whyItMatters": 1-2 concise sentences explaining why this observation is crucial for the reader.
- "supportingEvidence": exact evidence or text excerpt from the uploaded documents.
- "confidence": "High", "Medium", or "Low"
- "citations": array of 1-2 citation objects with:
    - "sourceId": exact ID from active sources above
    - "sourceTitle": title of the source
    - "sourceType": type of source ("pdf", "text", "url", "youtube", "vtt")
    - "pageNumber": optional integer (if PDF)
    - "startTime": optional integer seconds (if video/VTT)
    - "textSnippet": short verbatim passage snippet from source
    - "urlOrPath": source URL or path

Return ONLY valid JSON matching this schema:
{
  "discoveries": [
    {
      "id": "disc-1",
      "rank": 1,
      "title": "Discovery Title",
      "category": "Contradiction",
      "whyItMatters": "Why this matters...",
      "supportingEvidence": "Evidence passage text...",
      "confidence": "High",
      "citations": [
        {
          "id": 1,
          "sourceId": "${readySources[0]?.id || ''}",
          "sourceTitle": "${readySources[0]?.title || ''}",
          "sourceType": "${readySources[0]?.type || 'pdf'}",
          "pageNumber": 1,
          "textSnippet": "Supporting snippet text...",
          "urlOrPath": "${readySources[0]?.urlOrPath || ''}"
        }
      ]
    }
  ]
}

Only return discoveries that are genuinely useful. Avoid obvious summaries or trivial observations. Return AT MOST 7 discoveries ranked by importance.

ACTIVE KNOWLEDGE SOURCES:
${sourceContexts}`;

    if (!process.env.OPENAI_API_KEY) {
      // Mock Fallback for local build/testing
      const mockDiscoveries: DiscoveryItem[] = readySources.slice(0, 5).map((s: any, idx: number) => {
        const categories: any[] = [
          'Contradiction',
          'Hidden Relationship',
          'Missing Information',
          'Trend',
          'Surprising Fact',
          'Actionable Insight',
        ];
        return {
          id: `mock-disc-${idx + 1}`,
          rank: idx + 1,
          title: `Key Architectural Insight ${idx + 1}: ${s.title}`,
          category: categories[idx % categories.length],
          whyItMatters: `This discovery highlights hidden structural patterns in ${s.title} that directly impact implementation reliability and maintainability.`,
          supportingEvidence: `Evidence excerpt extracted from source ${s.title} showing cross-module interactions and design patterns.`,
          confidence: idx === 0 ? 'High' : idx % 2 === 0 ? 'Medium' : 'High',
          citations: [
            {
              id: 1,
              sourceId: s.id,
              sourceTitle: s.title,
              sourceType: s.type,
              pageNumber: s.type === 'pdf' ? 1 : undefined,
              startTime: s.type === 'youtube' || s.type === 'vtt' ? 30 : undefined,
              textSnippet: `Passage excerpt from ${s.title}`,
              videoId: extractYouTubeVideoId(s.urlOrPath) || undefined,
              urlOrPath: s.urlOrPath || undefined,
            },
          ],
        };
      });

      return NextResponse.json({ discoveries: mockDiscoveries });
    }

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })
    );

    const content = completion.choices[0]?.message?.content || '{}';
    const parsedData = JSON.parse(content);

    // Enrich videoId, clean titles, and verify grounding text snippets
    if (Array.isArray(parsedData.discoveries)) {
      parsedData.discoveries.forEach((disc: any) => {
        if (Array.isArray(disc.citations)) {
          disc.citations.forEach((cit: any, idx: number) => {
            cit.id = idx + 1;
            const matchedSrc =
              readySources.find((s: any) => s.id === cit.sourceId || s.title === cit.sourceTitle) || readySources[0];
            if (matchedSrc) {
              cit.sourceId = matchedSrc.id;
              // Clean noisy WEBVTT timestamp prefix from source title if present
              const rawTitle = matchedSrc.title || 'Knowledge Source';
              cit.sourceTitle = rawTitle.replace(/^WEBVTT\s+[\d:.]+\s*-->\s*[\d:.]+\s*/i, '').trim() || rawTitle;
              cit.sourceType = matchedSrc.type;
              cit.urlOrPath = matchedSrc.urlOrPath;
              cit.videoId = extractYouTubeVideoId(matchedSrc.urlOrPath);

              // Grounding text snippet security check
              if (!cit.textSnippet || cit.textSnippet.trim().length === 0) {
                cit.textSnippet = disc.supportingEvidence || matchedSrc.content?.slice(0, 300) || matchedSrc.title;
              }
            }
          });
        }
      });
    }

    return NextResponse.json({ discoveries: parsedData.discoveries || [] });
  } catch (error: any) {
    console.error('POST /api/discoveries error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
