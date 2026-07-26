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
          } catch (e) { }
        }
      }
    }
  }

  const regex = new RegExp(`${globalName}\\s*=\\s*({.+?})\\s*;\\s*(?:var|const|let|\\n)`, 's');
  const match = html.match(regex);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) { }
  }

  const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (tracksMatch) {
    try {
      const tracks = JSON.parse(tracksMatch[1]);
      return { captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } } };
    } catch (e) { }
  }

  return null;
}

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

async function fetchWatchPageAndTracks(
  videoId: string,
  userAgent: string
): Promise<{ baseUrl: string; languageCode: string }[] | null> {
  const consentNum = Math.floor(Math.random() * 900) + 100;
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: `CONSENT=YES+cb.20210328-17-p0.en+FX+${consentNum}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Watch page returned status ${res.status}`);
  }

  const html = await res.text();

  // Bot/consent detection markers — bail early with a clear signal to retry with a different UA
  if (html.includes('action="https://consent.youtube.com') || html.includes('id="captcha-form"')) {
    throw new Error('Blocked by consent/captcha interstitial');
  }

  const playerResponse = extractInlineJson(html, 'var ytInitialPlayerResponse');
  if (!playerResponse) {
    throw new Error('Could not locate ytInitialPlayerResponse in page');
  }

  const playabilityStatus = playerResponse?.playabilityStatus?.status;
  if (playabilityStatus && playabilityStatus !== 'OK') {
    throw new Error(`Video not playable: ${playabilityStatus}`);
  }

  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    return null; // no captions at all — not an error, just genuinely no captions
  }

  return tracks;
}

async function fetchDirectAttempt(
  videoId: string,
  lang: string,
  userAgent: string
): Promise<TranscriptItem[] | null> {
  const tracks = await fetchWatchPageAndTracks(videoId, userAgent);
  if (!tracks) return null;

  const track = tracks.find((t: any) => t.languageCode === lang) ?? tracks[0];
  if (!track?.baseUrl) return null;

  const captionRes = await fetch(`${track.baseUrl}&fmt=json3`, {
    headers: { 'User-Agent': userAgent },
  });
  if (!captionRes.ok) {
    throw new Error(`Caption track fetch returned status ${captionRes.status}`);
  }

  const data = await captionRes.json();
  const events = data?.events;
  if (!events || events.length === 0) return null;

  const items: TranscriptItem[] = [];
  for (const ev of events) {
    if (!ev.segs || ev.segs.length === 0) continue;
    const text = ev.segs.map((s: any) => s.utf8 ?? '').join('').trim();
    if (!text) continue;
    items.push({
      text: decodeHTMLEntities(text),
      offset: ev.tStartMs ?? 0,
      duration: ev.dDurationMs ?? 0,
    });
  }

  return items.length > 0 ? items : null;
}

export async function fetchTranscriptDirect(
  videoId: string,
  lang: string = 'en'
): Promise<TranscriptItem[]> {
  try {
    const result = await fetchDirectAttempt(videoId, lang, DESKTOP_UA);
    if (result) return result;
  } catch (err: any) {
    console.warn(`[fetchTranscriptDirect] desktop UA attempt failed for ${videoId}:`, err?.message || err);
  }

  try {
    const result = await fetchDirectAttempt(videoId, lang, MOBILE_UA);
    if (result) return result;
  } catch (err: any) {
    console.warn(`[fetchTranscriptDirect] mobile UA attempt failed for ${videoId}:`, err?.message || err);
  }

  throw new Error('Direct fetch found no usable captions');
}

async function fetchTranscriptItems(videoId: string): Promise<TranscriptItem[]> {
  // Strategy 1: Direct watch-page fetch (free, no proxy — most resilient to IP blocking issues)
  try {
    const items = await fetchTranscriptDirect(videoId, 'en');
    if (items && items.length > 0) {
      return items;
    }
  } catch (err: any) {
    console.warn(`[fetchTranscriptDirect] failed for ${videoId}:`, err?.message || err);
  }

  // Strategy 2: youtube-caption-extractor (InnerTube API across Android/iOS/mweb client profiles)
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

  // Strategy 3: YoutubeTranscript fallback
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

export async function parseYouTubeVideo(
  url: string,
  notebookId: string,
  sourceId: string,
  customTitle?: string
) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL format. Please provide a valid YouTube video link.');
  }

  const videoTitle =
    customTitle && customTitle !== 'YOUTUBE Source'
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