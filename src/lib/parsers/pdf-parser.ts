import { ChunkMetadata } from '../types';

export async function parsePdfBuffer(pdfBuffer: Buffer, notebookId: string, sourceId: string, sourceTitle: string) {
  try {
    let pdfParse: any;
    try {
      pdfParse = require('pdf-parse/lib/pdf-parse.js');
    } catch {
      pdfParse = require('pdf-parse');
    }
    const data = await pdfParse(pdfBuffer);
    const text = data.text;
    const totalPages = data.numpages || 1;

    if (!text || text.trim().length < 20) {
      throw new Error('This PDF appears to be a scanned image or contains no readable text.');
    }

    const chunkSize = 600;
    const chunkOverlap = 100;
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const chunks: { text: string; metadata: Partial<ChunkMetadata> }[] = [];

    let currentIndex = 0;
    let chunkIdx = 0;
    const wordsPerPage = Math.max(1, Math.floor(words.length / (totalPages || 1)));

    while (currentIndex < words.length) {
      const chunkWords = words.slice(currentIndex, currentIndex + chunkSize);
      const chunkText = chunkWords.join(' ').trim();
      const pageNumber = Math.min(totalPages, Math.floor(currentIndex / wordsPerPage) + 1);

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          metadata: {
            notebookId,
            sourceId,
            sourceTitle,
            sourceType: 'pdf',
            pageNumber,
            chunkIndex: chunkIdx++,
            text: chunkText,
          },
        });
      }

      currentIndex += chunkSize - chunkOverlap;
    }

    return {
      totalPages,
      chunks,
    };
  } catch (err: any) {
    if (err.message?.includes('password')) {
      throw new Error('This PDF is password protected. Please remove the password and try again.');
    }
    throw new Error(`PDF Parsing Error: ${err.message}`);
  }
}
