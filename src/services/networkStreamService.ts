/**
 * Network Stream Service — SMB / FTP / WebDAV
 *
 * On mobile (iOS/Android): delegates to react-native-vlc-media-player
 *   which supports smb://, ftp://, and http(s):// natively via libVLC.
 *
 * On Electron: MPV supports all these protocols natively.
 *   File browser is provided to navigate shares before handing URI to player.
 *
 * On web browser: WebDAV via fetch (CORS permitting); SMB/FTP not supported.
 */

import { Platform } from 'react-native';
import { MediaItem } from '../types';
import { AppConfig } from '../config/appConfig';

// ─── Connection profiles ──────────────────────────────────────────────────────

export type ProtocolType = 'smb' | 'ftp' | 'webdav';

export interface NetworkShare {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  port?: number;
  path: string;              // root share path e.g. /share or /
  username?: string;
  password?: string;
  anonymous?: boolean;
}

export interface NetworkEntry {
  name: string;
  path: string;              // full path on server
  uri: string;               // playable URI (smb://host/share/file)
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
}

// ─── URI builders ─────────────────────────────────────────────────────────────

export function buildURI(share: NetworkShare, remotePath: string): string {
  const auth = share.anonymous || (!share.username)
    ? ''
    : `${encodeURIComponent(share.username ?? '')}:${encodeURIComponent(share.password ?? '')}@`;

  const port = share.port ? `:${share.port}` : '';

  switch (share.protocol) {
    case 'smb':
      return `smb://${auth}${share.host}${port}${remotePath}`;
    case 'ftp':
      return `ftp://${auth}${share.host}${port}${remotePath}`;
    case 'webdav':
      return `http://${auth}${share.host}${port}${remotePath}`;
  }
}

// ─── Directory listing ────────────────────────────────────────────────────────

/**
 * List the contents of a directory on a network share.
 * Returns MediaEntry[] — consumers filter by extension.
 */
export async function listDirectory(
  share: NetworkShare,
  remotePath: string
): Promise<NetworkEntry[]> {
  if (share.protocol === 'webdav') {
    return listWebDAV(share, remotePath);
  }

  // SMB / FTP on mobile: VLC handles navigation internally.
  // On Electron: delegate to mpv/IPC or use a native lib.
  if (Platform.OS === 'web' && (window as any).electronAPI) {
    return (window as any).electronAPI.networkList(share, remotePath);
  }

  // Mobile: VLC can browse smb:// directories
  return listVLCDirectory(share, remotePath);
}

// ─── WebDAV listing ───────────────────────────────────────────────────────────

async function listWebDAV(share: NetworkShare, remotePath: string): Promise<NetworkEntry[]> {
  const uri = buildURI(share, remotePath);
  const headers: Record<string, string> = {
    Depth: '1',
    'Content-Type': 'application/xml',
  };
  if (share.username) {
    headers['Authorization'] = 'Basic ' + btoa(`${share.username}:${share.password ?? ''}`);
  }

  const res = await fetch(uri, { method: 'PROPFIND', headers });
  if (!res.ok) throw new Error(`WebDAV PROPFIND failed: ${res.status}`);

  const xml = await res.text();
  return parseWebDAVResponse(xml, share, remotePath);
}

function parseWebDAVResponse(
  xml: string,
  share: NetworkShare,
  basePath: string
): NetworkEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const responses = Array.from(doc.querySelectorAll('response'));

  const entries: NetworkEntry[] = [];

  for (const resp of responses) {
    const href = resp.querySelector('href')?.textContent ?? '';
    const displayName = resp.querySelector('displayname')?.textContent ?? href.split('/').filter(Boolean).pop() ?? '';
    const isCollection = !!resp.querySelector('collection');
    const contentLength = resp.querySelector('getcontentlength')?.textContent;
    const lastModified = resp.querySelector('getlastmodified')?.textContent;

    // Skip the base directory itself
    if (decodeURIComponent(href).replace(/\/$/, '') === basePath.replace(/\/$/, '')) continue;

    const decodedPath = decodeURIComponent(href);

    entries.push({
      name: displayName,
      path: decodedPath,
      uri: buildURI(share, decodedPath),
      isDirectory: isCollection,
      size: contentLength ? Number(contentLength) : undefined,
      modifiedAt: lastModified ?? undefined,
    });
  }

  return entries.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));
}

// ─── VLC directory browse (mobile fallback) ───────────────────────────────────

async function listVLCDirectory(share: NetworkShare, remotePath: string): Promise<NetworkEntry[]> {
  // react-native-vlc-media-player can browse directories; this bridges it
  // In a real app you'd use the VLC component's onVLCBrowse callback.
  // Here we return a placeholder and let VLC render its own browser overlay.
  console.warn('VLC directory browse: use VLCMediaPlayer onVLCBrowse in component');
  return [];
}

// ─── Convert NetworkEntry → MediaItem ────────────────────────────────────────

export function networkEntryToMediaItem(entry: NetworkEntry): MediaItem | null {
  const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
  const audioExts = ['mp3','wav','flac','aac','m4a','ogg','wma','opus','flac'];
  const videoExts = ['mp4','mkv','avi','mov','wmv','flv','webm','mpg','mpeg','m4v'];

  if (audioExts.includes(ext)) {
    return {
      id: entry.uri,
      title: entry.name.replace(/\.[^.]+$/, ''),
      path: entry.uri,
      uri: entry.uri,
      type: 'audio',
      addedAt: Date.now(),
    };
  }
  if (videoExts.includes(ext)) {
    return {
      id: entry.uri,
      title: entry.name.replace(/\.[^.]+$/, ''),
      path: entry.uri,
      uri: entry.uri,
      type: 'video',
      addedAt: Date.now(),
    };
  }
  return null;
}

// ─── Saved shares storage ─────────────────────────────────────────────────────

const STORAGE_KEY = '@network/shares';

export async function getSavedShares(): Promise<NetworkShare[]> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveShare(share: NetworkShare): Promise<void> {
  const shares = await getSavedShares();
  const idx = shares.findIndex((s) => s.id === share.id);
  if (idx >= 0) shares[idx] = share;
  else shares.push(share);
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shares));
}

export async function deleteShare(id: string): Promise<void> {
  const shares = (await getSavedShares()).filter((s) => s.id !== id);
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shares));
}
