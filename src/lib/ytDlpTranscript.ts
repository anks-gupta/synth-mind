import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface TranscriptItem {
  text: string;
  offset: number; // in milliseconds
  duration: number; // in milliseconds
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

/**
 * Checks if yt-dlp binary is available on PATH and if process.env.YT_COOKIES_PATH exists.
 * Logs a clear warning (not a crash) if either is missing.
 */
export async function checkYtDlpAvailable(): Promise<boolean> {
  let hasBinary = false;
  try {
    const { stdout } = await execFileAsync('yt-dlp', ['--version']);
    if (stdout && stdout.trim()) {
      console.log(`[yt-dlp] Verified yt-dlp binary (version ${stdout.trim()})`);
      hasBinary = true;
    }
  } catch {
    console.warn('[yt-dlp] Warning: yt-dlp binary is not installed on PATH or not executable.');
  }

  const cookiesPath = process.env.YT_COOKIES_PATH;
  let hasCookies = false;
  if (!cookiesPath) {
    console.warn('[yt-dlp] Warning: YT_COOKIES_PATH environment variable is not defined.');
  } else if (!fs.existsSync(cookiesPath)) {
    console.warn(`[yt-dlp] Warning: Cookies file specified at YT_COOKIES_PATH ("${cookiesPath}") does not exist.`);
  } else {
    console.log(`[yt-dlp] Verified cookies file at "${cookiesPath}"`);
    hasCookies = true;
  }

  return hasBinary && hasCookies;
}

/**
 * Shells out to yt-dlp with authenticated cookies to retrieve subtitles.
 */
export async function fetchTranscriptYtDlp(
  videoId: string,
  lang: string = 'en'
): Promise<TranscriptItem[]> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tmpDir = os.tmpdir();
  const outputPrefix = path.join(tmpDir, `ytdlp_${videoId}_${Date.now()}`);

  const cookiesPath = process.env.YT_COOKIES_PATH;

  const args: string[] = [
    url,
    '--skip-download',
    '--write-subs',
    '--write-auto-subs',
    '--sub-lang',
    `${lang},en,en-US,en-GB,en.*`,
    '--sub-format',
    'json3/vtt/best',
    '--no-warnings',
    '-o',
    outputPrefix,
  ];

  if (cookiesPath && fs.existsSync(cookiesPath)) {
    args.push('--cookies', cookiesPath);
  }

  try {
    await execFileAsync('yt-dlp', args, { timeout: 25000 });

    const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(path.basename(outputPrefix)));

    if (files.length === 0) {
      throw new Error('yt-dlp produced no subtitle files');
    }

    const jsonFile = files.find((f) => f.endsWith('.json3'));
    const vttFile = files.find((f) => f.endsWith('.vtt'));

    const items: TranscriptItem[] = [];

    if (jsonFile) {
      const fullPath = path.join(tmpDir, jsonFile);
      const jsonContent = fs.readFileSync(fullPath, 'utf8');

      const data = JSON.parse(jsonContent);
      const events = data?.events || [];
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
    } else if (vttFile) {
      const fullPath = path.join(tmpDir, vttFile);
      const vttContent = fs.readFileSync(fullPath, 'utf8');

      const lines = vttContent.split(/\r?\n/);
      let currentItem: Partial<TranscriptItem> | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const timeMatch = line.match(/^(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/);
        if (timeMatch) {
          const parseTime = (h: string, m: string, s: string, ms: string) => {
            const hrs = h ? parseInt(h.replace(':', ''), 10) : 0;
            const mins = parseInt(m, 10);
            const secs = parseInt(s, 10);
            const millis = parseInt(ms, 10);
            return (hrs * 3600 + mins * 60 + secs) * 1000 + millis;
          };
          const startMs = parseTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
          const endMs = parseTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
          currentItem = { offset: startMs, duration: Math.max(0, endMs - startMs), text: '' };
        } else if (currentItem && line && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
          const cleanLine = line.replace(/<[^>]+>/g, '').trim();
          if (cleanLine) {
            currentItem.text = (currentItem.text ? currentItem.text + ' ' : '') + cleanLine;
          }
        } else if (currentItem && !line && currentItem.text) {
          items.push({
            text: decodeHTMLEntities(currentItem.text),
            offset: currentItem.offset || 0,
            duration: currentItem.duration || 0,
          });
          currentItem = null;
        }
      }
      if (currentItem && currentItem.text) {
        items.push({
          text: decodeHTMLEntities(currentItem.text),
          offset: currentItem.offset || 0,
          duration: currentItem.duration || 0,
        });
      }
    }

    // Clean up temporary files
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(tmpDir, f));
      } catch {}
    }

    if (items.length === 0) {
      throw new Error('No valid transcript items parsed from yt-dlp output');
    }

    return items;
  } catch (err: any) {
    const details = (err?.stderr || err?.stdout || err?.message || String(err)).trim();
    // Cleanup temporary files on error
    try {
      const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(path.basename(outputPrefix)));
      for (const f of files) {
        fs.unlinkSync(path.join(tmpDir, f));
      }
    } catch {}
    throw new Error(`yt-dlp transcript fetch failed: ${details}`);
  }
}
