import { SourceType } from './types';

/**
 * Formats raw source types ('pdf', 'youtube', 'url', 'vtt', 'text')
 * into human-readable Title Case labels instead of ALL CAPS.
 */
export function formatSourceType(type: SourceType | string): string {
  switch (type?.toLowerCase()) {
    case 'pdf':
      return 'PDF Document';
    case 'youtube':
      return 'YouTube Video';
    case 'url':
      return 'Web Article';
    case 'vtt':
      return 'VTT Transcript';
    case 'text':
      return 'Text Note';
    default:
      return type;
  }
}

/**
 * Short badge label for source cards and tags.
 */
export function formatSourceBadge(type: SourceType | string): string {
  switch (type?.toLowerCase()) {
    case 'pdf':
      return 'PDF';
    case 'youtube':
      return 'YouTube';
    case 'url':
      return 'Web';
    case 'vtt':
      return 'Transcript';
    case 'text':
      return 'Note';
    default:
      return type;
  }
}

/**
 * Formats raw seconds (e.g. 525) into readable MM:SS or HH:MM:SS format.
 */
export function formatSeconds(sec?: number): string {
  if (sec === undefined || sec === null || isNaN(sec)) return '0:00';
  const totalSecs = Math.floor(sec);
  const hours = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  if (hours > 0) {
    return `${hours}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}
