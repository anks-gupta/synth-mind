import { ChunkMetadata } from '../types';

export async function parseTextContent(text: string, notebookId: string, sourceId: string, sourceTitle: string) {
  const chunkSize = 600;
  const chunkOverlap = 100;
  const words = text.split(/\s+/);
  const chunks: { text: string; metadata: Partial<ChunkMetadata> }[] = [];

  let currentIndex = 0;
  let chunkIdx = 0;

  while (currentIndex < words.length) {
    const chunkWords = words.slice(currentIndex, currentIndex + chunkSize);
    const chunkText = chunkWords.join(' ').trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        metadata: {
          notebookId,
          sourceId,
          sourceTitle,
          sourceType: 'text',
          chunkIndex: chunkIdx++,
          text: chunkText,
        },
      });
    }

    currentIndex += chunkSize - chunkOverlap;
  }

  return chunks;
}
