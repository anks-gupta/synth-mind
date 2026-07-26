import { parsePdfBuffer } from './pdf-parser';
import { parseYouTubeVideo } from './youtube-parser';
import { parseVttContent } from './vtt-parser';
import { parseWebUrl } from './web-parser';
import { parseTextContent } from './text-parser';
import { SourceType } from '../types';

export class SourceParserFactory {
  static async parseSource(params: {
    type: SourceType;
    notebookId: string;
    sourceId: string;
    title: string;
    contentOrUrl: string | Buffer;
  }) {
    const { type, notebookId, sourceId, title, contentOrUrl } = params;

    switch (type) {
      case 'pdf': {
        if (!(contentOrUrl instanceof Buffer)) {
          throw new Error('PDF parser requires a file Buffer');
        }
        const result = await parsePdfBuffer(contentOrUrl, notebookId, sourceId, title);
        return {
          title: title || 'PDF Document',
          chunks: result.chunks,
        };
      }

      case 'youtube': {
        if (typeof contentOrUrl !== 'string') {
          throw new Error('YouTube parser requires a URL string');
        }
        return await parseYouTubeVideo(contentOrUrl, notebookId, sourceId, title);
      }

      case 'vtt': {
        if (typeof contentOrUrl !== 'string') {
          throw new Error('VTT parser requires text content');
        }
        return await parseVttContent(contentOrUrl, notebookId, sourceId, title);
      }

      case 'url': {
        if (typeof contentOrUrl !== 'string') {
          throw new Error('Web parser requires a URL string');
        }
        return await parseWebUrl(contentOrUrl, notebookId, sourceId, title);
      }

      case 'text': {
        if (typeof contentOrUrl !== 'string') {
          throw new Error('Text parser requires string content');
        }
        const isGeneric = !title || /^(URL|PDF|YOUTUBE|VTT|TEXT)\s+Source$/i.test(title.trim());
        const words = contentOrUrl.trim().split(/\s+/).slice(0, 6).join(' ');
        const finalTitle = isGeneric && words ? `${words}...` : title || 'Plain Text Note';
        const chunks = await parseTextContent(contentOrUrl, notebookId, sourceId, finalTitle);
        return {
          title: finalTitle,
          chunks,
        };
      }

      default:
        throw new Error(`Unsupported source type: ${type}`);
    }
  }
}
