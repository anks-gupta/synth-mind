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

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractInlineJson(html: string, globalName: string): any {
  const token = `${globalName} = `;
  const idx = html.indexOf(token);
  if (idx !== -1) {
    const start = idx + token.length;
    let depth = 0;
    for (let i = start; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch (e) {}
        }
      }
    }
  }

  const regex = new RegExp(`${globalName}\\s*=\\s*({.+?})\\s*;\\s*(?:var|const|let|\\n)`, 's');
  const match = html.match(regex);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {}
  }

  const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (tracksMatch) {
    try {
      const tracks = JSON.parse(tracksMatch[1]);
      return { captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } } };
    } catch (e) {}
  }

  return null;
}

async function fetchWatchPage(videoId: string, userAgent: string): Promise<any[]> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const consentCookie = `CONSENT=YES+cb.20210328-17-p0.en+FX+${Math.floor(Math.random() * 900) + 100}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': consentCookie,
      'Sec-Fetch-Mode': 'navigate',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Watch page returned status ${res.status}`);
  }

  const html = await res.text();
  const playerResponse = extractInlineJson(html, 'ytInitialPlayerResponse');
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('No captionTracks found in watch page response');
  }

  return tracks;
}

export async function fetchTranscriptDirect(videoId: string, lang = 'en'): Promise<TranscriptItem[]> {
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const mobileUA = 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

  let tracks: any[];
  try {
    tracks = await fetchWatchPage(videoId, desktopUA);
  } catch (err: any) {
    console.warn(`[fetchTranscriptDirect desktop] failed for ${videoId}:`, err?.message || err);
    tracks = await fetchWatchPage(videoId, mobileUA);
  }

  const selectedTrack =
    tracks.find((t: any) => t.languageCode === lang) ||
    tracks.find((t: any) => t.languageCode?.startsWith(lang)) ||
    tracks[0];

  if (!selectedTrack?.baseUrl) {
    throw new Error('Selected caption track has no baseUrl');
  }

  const trackUrl = selectedTrack.baseUrl.replace(/&fmt=[^&]+/, '') + '&fmt=json3';
  const trackRes = await fetch(trackUrl, {
    headers: { 'User-Agent': desktopUA },
    cache: 'no-store',
  });

  if (!trackRes.ok) {
    throw new Error(`Caption track fetch failed with status ${trackRes.status}`);
  }

  const jsonText = await trackRes.text();
  if (!jsonText.trim()) {
    throw new Error('Caption track returned empty text');
  }

  const items: TranscriptItem[] = [];

  // Try JSON fmt=json3 parsing
  try {
    const data = JSON.parse(jsonText);
    const events = data.events || [];
    for (const event of events) {
      if (!event.segs || event.aAppend === 1) continue;
      const rawText = event.segs.map((s: any) => s.utf8 || '').join('');
      const cleanedText = decodeHTMLEntities(rawText).trim();
      if (cleanedText) {
        items.push({
          text: cleanedText,
          offset: event.tStartMs || 0,
          duration: event.dDurationMs || 0,
        });
      }
    }
    if (items.length > 0) return items;
  } catch (e) {}

  // Fallback XML parsing (<text start="s" dur="s">)
  const xmlRegex = /<text\s+start="([\d\.]+)"\s+dur="([\d\.]+)"[^>]*>(.*?)<\/text>/gi;
  let match: RegExpExecArray | null;
  while ((match = xmlRegex.exec(jsonText)) !== null) {
    const startSec = parseFloat(match[1]);
    const durSec = parseFloat(match[2]);
    const cleanedText = decodeHTMLEntities(match[3]).trim();
    if (cleanedText) {
      items.push({
        text: cleanedText,
        offset: Math.floor(startSec * 1000),
        duration: Math.floor(durSec * 1000),
      });
    }
  }

  if (items.length === 0) {
    throw new Error('No valid transcript items parsed from caption track');
  }

  return items;
}

const noCacheFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    cache: 'no-store',
  });
};

async function fetchTranscriptItems(videoId: string): Promise<TranscriptItem[]> {
  // Strategy 1: Direct watch page fetch with CONSENT cookie and Desktop/Mobile UA retry
  try {
    const items = await fetchTranscriptDirect(videoId, 'en');
    if (items && items.length > 0) {
      return items;
    }
  } catch (err: any) {
    console.warn(`[fetchTranscriptDirect] failed for ${videoId}:`, err?.message || err);
  }

  // Strategy 2: youtube-caption-extractor with lang='en' and no-store cache
  try {
    const subtitles = await getSubtitles({ videoID: videoId, lang: 'en', fetch: noCacheFetch });
    if (subtitles && subtitles.length > 0) {
      return subtitles.map((sub: { start: string; dur: string; text: string }) => ({
        text: sub.text,
        offset: Math.floor(parseFloat(sub.start) * 1000),
        duration: Math.floor(parseFloat(sub.dur) * 1000),
      }));
    }
  } catch (err: any) {
    console.warn(`[youtube-caption-extractor lang=en] failed for ${videoId}:`, err?.message || err);
  }

  // Strategy 3: youtube-caption-extractor default track (any language / auto-generated fallback)
  try {
    const subtitles = await getSubtitles({ videoID: videoId, fetch: noCacheFetch });
    if (subtitles && subtitles.length > 0) {
      return subtitles.map((sub: { start: string; dur: string; text: string }) => ({
        text: sub.text,
        offset: Math.floor(parseFloat(sub.start) * 1000),
        duration: Math.floor(parseFloat(sub.dur) * 1000),
      }));
    }
  } catch (err: any) {
    console.warn(`[youtube-caption-extractor default] failed for ${videoId}:`, err?.message || err);
  }

  // Strategy 4: YoutubeTranscript fallback
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
