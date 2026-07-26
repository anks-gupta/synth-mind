import * as cheerio from 'cheerio';
import { ChunkMetadata } from '../types';

export async function parseWebUrl(url: string, notebookId: string, sourceId: string, customTitle?: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove unwanted script, style, nav, footer elements
    $('script, style, nav, footer, header, iframe, noscript').remove();

    const isGenericTitle = !customTitle || /^(URL|PDF|YOUTUBE|VTT|TEXT)\s+Source$/i.test(customTitle.trim());
    const scrapedTitle = $('title').text().trim() || $('h1').first().text().trim() || new URL(url).hostname;
    const title = isGenericTitle ? scrapedTitle : customTitle;

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    if (!bodyText || bodyText.length < 30) {
      throw new Error('Extracted web page content is empty or unreadable.');
    }

    // Chunking text
    const chunkSize = 600;
    const chunkOverlap = 100;
    const words = bodyText.split(' ');
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
            sourceTitle: title,
            sourceType: 'url',
            chunkIndex: chunkIdx++,
            urlOrPath: url,
            text: chunkText,
          },
        });
      }

      currentIndex += chunkSize - chunkOverlap;
    }

    return {
      title,
      chunks,
    };
  } catch (err: any) {
    throw new Error(`Web URL Scraping Error: ${err.message}`);
  }
}
