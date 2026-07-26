import { getSubtitles } from 'youtube-caption-extractor';
import { YoutubeTranscript } from 'youtube-transcript';
import { ChunkMetadata } from '../types';

export function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return data.title || `YouTube Video (${videoId})`;
  } catch (err) {
    return `YouTube Video (${videoId})`;
  }
}

interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

async function fetchTranscriptItems(videoId: string): Promise<TranscriptItem[]> {
  // Strategy 1: youtube-caption-extractor (InnerTube API across Android/iOS/mweb client profiles)
  try {
    const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });
    if (subtitles && subtitles.length > 0) {
      return subtitles.map((sub: { start: string; dur: string; text: string }) => ({
        text: sub.text,
        offset: Math.floor(parseFloat(sub.start) * 1000),
        duration: Math.floor(parseFloat(sub.dur) * 1000),
      }));
    }
  } catch (err: any) {
    console.warn(`[youtube-caption-extractor] failed for ${videoId}:`, err?.message || err);
  }

  // Strategy 2: YoutubeTranscript fallback
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      return items.map((item) => ({
        text: item.text,
        offset: item.offset,
        duration: item.duration,
      }));
    }
  } catch (err: any) {
    console.warn(`[YoutubeTranscript] failed for ${videoId}:`, err?.message || err);
  }

  throw new Error('Captions unavailable for this video');
}

export async function parseYouTubeVideo(url: string, notebookId: string, sourceId: string, customTitle?: string) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL format. Please provide a valid YouTube video link.');
  }

  const videoTitle = customTitle && customTitle !== 'YOUTUBE Source'
    ? customTitle
    : await fetchYouTubeMetadata(videoId);

  try {
    const transcriptItems = await fetchTranscriptItems(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript captions found for this YouTube video.');
    }

    const chunks: { text: string; metadata: Partial<ChunkMetadata> }[] = [];
    const groupSize = 10;

    for (let i = 0; i < transcriptItems.length; i += groupSize) {
      const slice = transcriptItems.slice(i, i + groupSize);
      const combinedText = slice.map((item) => item.text).join(' ').trim();
      const startTimeSec = Math.floor(slice[0].offset / 1000);

      if (combinedText.length > 0) {
        chunks.push({
          text: combinedText,
          metadata: {
            notebookId,
            sourceId,
            sourceTitle: videoTitle,
            sourceType: 'youtube',
            startTime: startTimeSec,
            chunkIndex: chunks.length,
            videoId,
            urlOrPath: url,
            text: combinedText,
          },
        });
      }
    }

    return {
      title: videoTitle,
      videoId,
      chunks,
    };
  } catch (err: any) {
    throw new Error(`YouTube Transcript Error: ${err.message || 'Captions unavailable for this video'}`);
  }
}
