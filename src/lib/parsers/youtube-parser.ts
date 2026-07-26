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

export async function parseYouTubeVideo(url: string, notebookId: string, sourceId: string, customTitle?: string) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL format. Please provide a valid YouTube video link.');
  }

  const videoTitle = customTitle && customTitle !== 'YOUTUBE Source'
    ? customTitle
    : await fetchYouTubeMetadata(videoId);

  try {
    let transcriptItems;
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (e) {
      transcriptItems = await YoutubeTranscript.fetchTranscript(url);
    }

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
