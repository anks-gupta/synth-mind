import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { withRetry } from '@/lib/openai-retry';
import { extractYouTubeVideoId } from '@/lib/parsers/youtube-parser';
import { authorizeNotebookAccess } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
});

export async function POST(req: Request) {
  try {
    const { notebookId, activeSourceIds } = await req.json();

    const { notebook, errorResponse } = await authorizeNotebookAccess(notebookId);
    if (errorResponse) return errorResponse;

    if (!notebook || notebook.sources.length === 0) {
      return NextResponse.json({
        error: 'Please ingest at least 1 knowledge source into this notebook to generate a Study Plan.',
      });
    }

    let readySources = notebook.sources.filter((s: any) => s.status === 'ready');

    if (activeSourceIds && Array.isArray(activeSourceIds) && activeSourceIds.length > 0) {
      readySources = readySources.filter((s: any) => activeSourceIds.includes(s.id));
    }

    if (readySources.length === 0) {
      return NextResponse.json({
        error: 'No active ready sources selected. Please check at least 1 source in Knowledge Vault.',
      });
    }

    const sourceSummaries = readySources
      .map(
        (s: any) => `- ID: "${s.id}", Title: "${s.title}", Type: "${s.type}", URL/Path: "${s.urlOrPath || 'N/A'}"`
      )
      .join('\n');

    const prompt = `Analyze ONLY the following ACTIVE knowledge sources ingested in notebook "${notebook.title}":
${sourceSummaries}

CRITICAL: Do NOT include any content or references from unselected or unlisted sources. Only use the listed active sources above!

Generate a structured, step-by-step sequential learning curriculum (3 to 5 logical modules).
For each step, specify:
1. "stepNumber" (integer)
2. "topic" (short module title)
3. "summary" (1-2 sentence learning objective)
4. "resources" array containing pinpointed citations back to the source IDs above with EXACT topic sections, timestamp ranges, or page ranges:
   - For YouTube/VTT: include "timeRange" (e.g. "03:15 - 08:45"), "startTime" (start seconds integer, e.g. 195), and "urlOrPath".
   - For PDFs: include "pageRange" (e.g. "Pages 12 - 18"), "pageNumber" (start page integer), and "urlOrPath".
   - For Web URLs: include "sectionTitle" (e.g. "InputGuard Validation"), "sectionAnchor" (e.g. "input-guardrails" or "testing-guardrails"), "title", and "urlOrPath".

Return ONLY valid JSON matching this schema:
{
  "title": "${notebook.title} Learning Roadmap",
  "steps": [
    {
      "stepNumber": 1,
      "topic": "Module Title",
      "summary": "Objective text...",
      "resources": [
        {
          "sourceId": "${readySources[0]?.id || 'source-uuid'}",
          "title": "${readySources[0]?.title || 'Source Title'}",
          "type": "${readySources[0]?.type || 'url'}",
          "sectionTitle": "InputGuard & Prompt Redaction",
          "sectionAnchor": "input-guardrails",
          "timeRange": "03:15 - 08:45",
          "startTime": 195,
          "pageRange": "Pages 1 - 5",
          "pageNumber": 1,
          "urlOrPath": "${readySources[0]?.urlOrPath || ''}"
        }
      ]
    }
  ]
}`;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        title: `${notebook.title} Sequential Study Plan`,
        steps: readySources.map((s: any, idx: number) => {
          const videoId = extractYouTubeVideoId(s.urlOrPath);
          return {
            stepNumber: idx + 1,
            topic: `Step ${idx + 1}: ${s.title}`,
            summary: `Master foundational concepts covered in ${s.title}.`,
            completed: false,
            resources: [
              {
                sourceId: s.id,
                title: s.title,
                type: s.type as any,
                sectionTitle: s.type === 'url' ? `Section ${idx + 1}` : undefined,
                sectionAnchor: s.type === 'url' ? `section-${idx + 1}` : undefined,
                pageNumber: s.type === 'pdf' ? 1 : undefined,
                pageRange: s.type === 'pdf' ? 'Pages 1 - 8' : undefined,
                startTime: s.type === 'youtube' || s.type === 'vtt' ? 45 : undefined,
                timeRange: s.type === 'youtube' || s.type === 'vtt' ? '00:45 - 06:30' : undefined,
                displayTime: s.type === 'youtube' || s.type === 'vtt' ? '00:45' : undefined,
                videoId: videoId || undefined,
                urlOrPath: s.urlOrPath || undefined,
              },
            ],
          };
        }),
      });
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

    // Enrich videoId and urlOrPath for all steps
    if (Array.isArray(parsedData.steps)) {
      parsedData.steps.forEach((step: any) => {
        if (Array.isArray(step.resources)) {
          step.resources.forEach((res: any) => {
            const matchedSrc = readySources.find((s: any) => s.id === res.sourceId || s.title === res.title) || readySources[0];
            if (matchedSrc) {
              res.sourceId = matchedSrc.id;
              res.title = matchedSrc.title;
              res.urlOrPath = matchedSrc.urlOrPath;
              res.type = matchedSrc.type;
              res.videoId = extractYouTubeVideoId(matchedSrc.urlOrPath);
            }
          });
        }
      });
    }

    // Save to DB
    await db.studyPlan.create({
      data: {
        notebookId,
        title: parsedData.title || `${notebook.title} Study Plan`,
        stepData: parsedData.steps || [],
      },
    });

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('POST /api/study-plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
