import { ChunkMetadata } from '../types';

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2].replace(',', '.'));
    return hours * 3600 + minutes * 60 + Math.floor(seconds);
  } else if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1].replace(',', '.'));
    return minutes * 60 + Math.floor(seconds);
  }
  return 0;
}

export async function parseVttContent(vttText: string, notebookId: string, sourceId: string, customTitle?: string) {
  const lines = vttText.split('\n');
  const chunks: { text: string; metadata: Partial<ChunkMetadata> }[] = [];

  let currentStartTime = 0;
  let currentBuffer: string[] = [];

  const timestampRegex = /(\d{2}:\d{2}:\d{2}[\.,]\d{3}|\d{2}:\d{2}[\.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[\.,]\d{3}|\d{2}:\d{2}[\.,]\d{3})/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('WEBVTT') || trimmed.startsWith('NOTE') || !trimmed) {
      continue;
    }

    const match = trimmed.match(timestampRegex);
    if (match) {
      if (currentBuffer.length > 0 && currentBuffer.join(' ').length > 200) {
        const text = currentBuffer.join(' ').trim();
        chunks.push({
          text,
          metadata: {
            notebookId,
            sourceId,
            sourceTitle: customTitle || 'Transcript Note',
            sourceType: 'vtt',
            startTime: currentStartTime,
            chunkIndex: chunks.length,
            text,
          },
        });
        currentBuffer = [];
      }
      currentStartTime = parseTimeToSeconds(match[1]);
    } else if (!/^\d+$/.test(trimmed)) {
      currentBuffer.push(trimmed);
    }
  }

  if (currentBuffer.length > 0) {
    const text = currentBuffer.join(' ').trim();
    chunks.push({
      text,
      metadata: {
        notebookId,
        sourceId,
        sourceTitle: customTitle || 'Transcript Note',
        sourceType: 'vtt',
        startTime: currentStartTime,
        chunkIndex: chunks.length,
        text,
      },
    });
  }

  const isGeneric = !customTitle || /^(URL|PDF|YOUTUBE|VTT|TEXT)\s+Source$/i.test(customTitle.trim());
  let finalTitle = customTitle;
  if (isGeneric && chunks.length > 0) {
    const firstText = chunks[0].text;
    const words = firstText.split(/\s+/).slice(0, 6).join(' ');
    finalTitle = words ? `${words}...` : 'Transcript Note';
  }

  return {
    title: finalTitle,
    chunks,
  };
}
