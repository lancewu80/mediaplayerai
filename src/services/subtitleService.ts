/**
 * Subtitle service
 *
 * 1. OpenSubtitles.com REST API v1 — search & download
 * 2. Local SRT / ASS / VTT parser  — via subsrt-ts
 * 3. Cue rendering helper          — returns the active cue for a given timestamp
 */

import { Platform } from 'react-native';
import { OnlineSubtitle, SubtitleCue } from '../types/video';

// ─── OpenSubtitles config ─────────────────────────────────────────────────────

const OS_API_BASE = 'https://api.opensubtitles.com/api/v1';
// Users should set their own API key at https://www.opensubtitles.com/consumers
const OS_API_KEY = 'YOUR_OPENSUBTITLES_API_KEY';
const OS_USER_AGENT = 'MediaPlayerAI v1.0';

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SubtitleSearchOptions {
  query?: string;        // movie/episode title
  imdbId?: string;       // e.g. "tt1375666"
  languages?: string[];  // ISO 639-1 e.g. ['en', 'zh-TW']
  year?: number;
  season?: number;
  episode?: number;
}

export async function searchSubtitles(opts: SubtitleSearchOptions): Promise<OnlineSubtitle[]> {
  const params = new URLSearchParams();
  if (opts.query)     params.set('query', opts.query);
  if (opts.imdbId)    params.set('imdb_id', opts.imdbId.replace('tt', ''));
  if (opts.languages?.length) params.set('languages', opts.languages.join(','));
  if (opts.year)      params.set('year', String(opts.year));
  if (opts.season)    params.set('season_number', String(opts.season));
  if (opts.episode)   params.set('episode_number', String(opts.episode));

  const res = await fetch(`${OS_API_BASE}/subtitles?${params}`, {
    headers: {
      'Api-Key': OS_API_KEY,
      'User-Agent': OS_USER_AGENT,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('OpenSubtitles API key required. Get one at opensubtitles.com');
    throw new Error(`OpenSubtitles search failed: ${res.status}`);
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data ?? []).map((item: any): OnlineSubtitle => {
    const attrs = item.attributes ?? {};
    const file = attrs.files?.[0] ?? {};
    return {
      id: String(item.id),
      name: attrs.release ?? file.file_name ?? 'Unknown',
      language: attrs.language ?? 'unknown',
      languageCode: attrs.language ?? 'und',
      downloadUrl: '', // filled after download token request
      rating: attrs.ratings,
      uploader: attrs.uploader?.name,
      uploadDate: attrs.upload_date,
      hearingImpaired: attrs.hearing_impaired,
      // store file_id for token request
      ..._fileId(file.file_id),
    };
  });
}

function _fileId(id: number | undefined) {
  return id ? { _fileId: id } : {};
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function getSubtitleDownloadUrl(fileId: number | string): Promise<string> {
  const res = await fetch(`${OS_API_BASE}/download`, {
    method: 'POST',
    headers: {
      'Api-Key': OS_API_KEY,
      'User-Agent': OS_USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_id: fileId }),
  });
  if (!res.ok) throw new Error(`OpenSubtitles download failed: ${res.status}`);
  const data = await res.json();
  return data.link as string;
}

export async function downloadSubtitleToCache(
  url: string,
  filename: string
): Promise<string> {
  if (Platform.OS === 'web') {
    // On web, return the URL directly for <track> element
    return url;
  }
  // Mobile: download to cache dir
  const { downloadAsync, cacheDirectory } = await import('expo-file-system');
  const dest = `${cacheDirectory}subtitles/${filename}`;
  await downloadAsync(url, dest);
  return dest;
}

// ─── SRT / ASS / VTT Parser ──────────────────────────────────────────────────

/**
 * Parses SRT, ASS, or VTT text into cue objects.
 * Uses regex-based parsing (no native dependencies needed).
 */
export function parseSRT(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    // Skip index line if numeric
    let i = 0;
    if (/^\d+$/.test(lines[0]?.trim())) i = 1;

    const timeLine = lines[i]?.trim();
    if (!timeLine) continue;

    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    );
    if (!timeMatch) continue;

    const start = parseSRTTime(timeMatch[1]);
    const end = parseSRTTime(timeMatch[2]);
    const text = lines
      .slice(i + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '') // strip HTML tags
      .trim();

    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function parseSRTTime(t: string): number {
  // "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
  const [hhmmss, ms] = t.replace(',', '.').split('.');
  const parts = hhmmss.split(':').map(Number);
  const [h, m, s] = parts;
  return (h * 3600 + m * 60 + s) * 1000 + (Number(ms) || 0);
}

export function parseVTT(text: string): SubtitleCue[] {
  // VTT is similar to SRT but with "WEBVTT" header
  const stripped = text.replace(/^WEBVTT.*$/m, '').trim();
  return parseSRT(stripped);
}

export function parseASS(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const dialogueRegex = /^Dialogue:\s*\d+,(\d+:\d+:\d+\.\d+),(\d+:\d+:\d+\.\d+),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)/gm;
  let match: RegExpExecArray | null;
  while ((match = dialogueRegex.exec(text)) !== null) {
    const start = parseASSTime(match[1]);
    const end = parseASSTime(match[2]);
    const raw = match[3].replace(/\{[^}]*\}/g, '').trim(); // strip style tags
    if (raw) cues.push({ start, end, text: raw });
  }
  return cues.sort((a, b) => a.start - b.start);
}

function parseASSTime(t: string): number {
  // "H:MM:SS.cc"
  const parts = t.split(':').map(Number);
  return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
}

export function parseSubtitleFile(content: string, filename: string): SubtitleCue[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'vtt') return parseVTT(content);
  if (ext === 'ass' || ext === 'ssa') return parseASS(content);
  return parseSRT(content); // default: SRT
}

// ─── Active cue lookup ────────────────────────────────────────────────────────

/**
 * Returns the cue(s) that should be visible at `posMs` milliseconds.
 * Applies `offsetMs` shift (positive = delay, negative = advance).
 */
export function getActiveCues(
  cues: SubtitleCue[],
  posMs: number,
  offsetMs = 0
): SubtitleCue[] {
  const adjusted = posMs - offsetMs;
  return cues.filter((c) => adjusted >= c.start && adjusted <= c.end);
}

// ─── Read subtitle file ───────────────────────────────────────────────────────

export async function readSubtitleFile(path: string): Promise<SubtitleCue[]> {
  let text: string;
  if (Platform.OS === 'web') {
    const res = await fetch(path);
    text = await res.text();
  } else {
    const { readAsStringAsync } = await import('expo-file-system');
    text = await readAsStringAsync(path, { encoding: 'utf8' } as any);
  }
  const filename = path.split(/[\\/]/).pop() ?? 'sub.srt';
  return parseSubtitleFile(text, filename);
}

// ─── Language names ───────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  en: 'English', 'zh-TW': 'Traditional Chinese', 'zh-CN': 'Simplified Chinese',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', fr: 'French',
  de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian',
  ru: 'Russian', ar: 'Arabic', th: 'Thai', vi: 'Vietnamese',
  hi: 'Hindi', tr: 'Turkish', pl: 'Polish', nl: 'Dutch',
};

export function languageName(code: string): string {
  return LANG_NAMES[code] ?? code.toUpperCase();
}
