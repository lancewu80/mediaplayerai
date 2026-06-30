import { Platform } from 'react-native';
import { MediaItem, Playlist, SUPPORTED_AUDIO_FORMATS, SUPPORTED_VIDEO_FORMATS } from '../types';
import { parseTitleFromFilename } from './audioService';

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getMediaType(path: string): 'audio' | 'video' {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_VIDEO_FORMATS.includes(ext) ? 'video' : 'audio';
}

export function isSupportedFormat(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS].includes(ext);
}

/** Convert a native filesystem path to a file:// URI with proper encoding. */
function pathToFileUri(filePath: string): string {
  // Normalise Windows backslashes to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  if (/^[A-Za-z]:\//.test(normalized)) {
    // Windows absolute path: C:/Users/Lance/下載/video.mp4
    // → file:///C:/Users/Lance/%E4%B8%8B%E8%BC%89/video.mp4
    const drive = normalized.slice(0, 2);           // 'C:'
    const rest  = normalized.slice(2);              // '/Users/Lance/下載/...'
    const encodedRest = rest
      .split('/')
      .map((seg) => (seg ? encodeURIComponent(seg) : ''))
      .join('/');
    return `file:///${drive}${encodedRest}`;
  }

  if (normalized.startsWith('/')) {
    // Unix/macOS absolute path
    const encoded = normalized
      .split('/')
      .map((seg) => (seg ? encodeURIComponent(seg) : ''))
      .join('/');
    return `file://${encoded}`;
  }

  // Fallback — return as-is
  return filePath;
}

export function buildMediaItemFromPath(filePath: string, uri?: string): MediaItem {
  const { title, artist } = parseTitleFromFilename(filePath);
  const type = getMediaType(filePath);
  return {
    id: makeId(),
    title,
    artist,
    path: filePath,
    uri: uri ?? pathToFileUri(filePath),
    type,
    addedAt: Date.now(),
  };
}

// ─── JSON import / export ─────────────────────────────────────────────────────

export function serializePlaylist(playlist: Playlist): string {
  return JSON.stringify(playlist, null, 2);
}

export function deserializePlaylist(json: string): Playlist {
  const obj = JSON.parse(json);
  if (!obj.id || !Array.isArray(obj.items)) {
    throw new Error('Invalid playlist format');
  }
  return obj as Playlist;
}

// ─── File-system helpers (Electron / web via IPC) ────────────────────────────

export async function savePlaylistToFile(playlist: Playlist, filePath: string): Promise<void> {
  const json = serializePlaylist(playlist);
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).electronAPI) {
    await (window as any).electronAPI.writeFile(filePath, json);
  } else {
    // Mobile: use expo-file-system
    const { writeAsStringAsync } = await import('expo-file-system');
    await writeAsStringAsync(filePath, json, { encoding: 'utf8' } as any);
  }
}

export async function loadPlaylistFromFile(filePath: string): Promise<Playlist> {
  let json: string;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).electronAPI) {
    json = await (window as any).electronAPI.readFile(filePath);
  } else {
    const { readAsStringAsync } = await import('expo-file-system');
    json = await readAsStringAsync(filePath, { encoding: 'utf8' } as any);
  }
  return deserializePlaylist(json);
}

export async function scanDirectory(dirPath: string): Promise<MediaItem[]> {
  const items: MediaItem[] = [];

  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).electronAPI) {
    const files: string[] = await (window as any).electronAPI.scanDirectory(dirPath);
    for (const f of files) {
      if (isSupportedFormat(f)) {
        items.push(buildMediaItemFromPath(f));
      }
    }
  } else {
    const { readDirectoryAsync, documentDirectory } = await import('expo-file-system');
    const uri = dirPath.startsWith('file://') ? dirPath : `file://${dirPath}`;
    const entries = await readDirectoryAsync(uri);
    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry}`;
      if (isSupportedFormat(entry)) {
        items.push(buildMediaItemFromPath(fullPath));
      }
    }
  }

  return items;
}
