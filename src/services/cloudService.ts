/**
 * Cloud Storage Service — Google Drive & Dropbox
 *
 * OAuth 2.0 flow:
 *   Mobile   : expo-auth-session (PKCE)
 *   Electron : Electron shell + redirect to localhost callback
 *
 * After auth, lists files and returns playable URLs.
 * Google Drive: needs a streaming-capable link (export or webContentLink).
 * Dropbox     : uses /2/files/get_temporary_link for direct streaming.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../config/appConfig';
import { MediaItem } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CloudProvider = 'google-drive' | 'dropbox';

export interface CloudToken {
  provider: CloudProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedAt?: string;
  thumbnailUrl?: string;
  isFolder: boolean;
  parentId?: string;
}

// ─── Token storage ────────────────────────────────────────────────────────────

const tokenKey = (provider: CloudProvider) => `@cloud/token/${provider}`;

export async function saveToken(token: CloudToken): Promise<void> {
  await AsyncStorage.setItem(tokenKey(token.provider), JSON.stringify(token));
}

export async function loadToken(provider: CloudProvider): Promise<CloudToken | null> {
  const raw = await AsyncStorage.getItem(tokenKey(provider)).catch(() => null);
  return raw ? JSON.parse(raw) : null;
}

export async function clearToken(provider: CloudProvider): Promise<void> {
  await AsyncStorage.removeItem(tokenKey(provider)).catch(() => {});
}

export async function isConnected(provider: CloudProvider): Promise<boolean> {
  const token = await loadToken(provider);
  if (!token) return false;
  if (token.expiresAt && token.expiresAt < Date.now()) return false;
  return true;
}

// ─── Google Drive ─────────────────────────────────────────────────────────────

const GD_AUTH_URL   = 'https://accounts.google.com/o/oauth2/v2/auth';
const GD_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const GD_API_BASE   = 'https://www.googleapis.com/drive/v3';
const GD_SCOPES     = 'https://www.googleapis.com/auth/drive.readonly';

export async function googleDriveSignIn(): Promise<CloudToken> {
  const cfg = AppConfig.streaming.googleDrive;
  if (!cfg.clientId) throw new Error('Google Drive Client ID not configured in .env');

  if (Platform.OS === 'web' && (window as any).electronAPI) {
    // Electron: open browser, capture redirect
    const token = await (window as any).electronAPI.oauthGoogleDrive(cfg.clientId, cfg.clientSecret);
    await saveToken({ provider: 'google-drive', ...token });
    return { provider: 'google-drive', ...token };
  }

  // Mobile: expo-auth-session
  const { makeRedirectUri, useAuthRequest, exchangeCodeAsync } =
    await import('expo-auth-session');

  const redirectUri = makeRedirectUri({ scheme: 'mediaplayerai' });

  const authUrl =
    `${GD_AUTH_URL}?client_id=${cfg.clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=${encodeURIComponent(GD_SCOPES)}&access_type=offline`;

  // In practice use useAuthRequest hook; this is a simplified flow
  throw new Error('Use googleDriveSignInHook in a React component (expo-auth-session)');
}

export async function listGoogleDriveFiles(
  folderId = 'root',
  pageToken?: string
): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
  const token = await loadToken('google-drive');
  if (!token) throw new Error('Not signed in to Google Drive');

  const q = `'${folderId}' in parents and trashed = false`;
  const fields = 'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,parents)';
  const params = new URLSearchParams({ q, fields, pageSize: '100', ...(pageToken ? { pageToken } : {}) });

  const res = await fetch(`${GD_API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (res.status === 401) { await clearToken('google-drive'); throw new Error('Google Drive token expired'); }
  if (!res.ok) throw new Error(`Google Drive list failed: ${res.status}`);

  const data = await res.json();

  const files: CloudFile[] = (data.files ?? []).map((f: any): CloudFile => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType ?? '',
    size: f.size ? Number(f.size) : undefined,
    modifiedAt: f.modifiedTime,
    thumbnailUrl: f.thumbnailLink,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    parentId: f.parents?.[0],
  }));

  return { files, nextPageToken: data.nextPageToken };
}

export async function getGoogleDriveStreamUrl(fileId: string): Promise<string> {
  const token = await loadToken('google-drive');
  if (!token) throw new Error('Not signed in to Google Drive');
  // Direct download URL (works for binary files)
  return `${GD_API_BASE}/files/${fileId}?alt=media&access_token=${token.accessToken}`;
}

// ─── Dropbox ──────────────────────────────────────────────────────────────────

const DBX_AUTH_URL  = 'https://www.dropbox.com/oauth2/authorize';
const DBX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DBX_API_BASE  = 'https://api.dropboxapi.com/2';

export async function dropboxSignIn(): Promise<CloudToken> {
  const cfg = AppConfig.streaming.dropbox;
  if (!cfg.appKey) throw new Error('Dropbox App Key not configured in .env');
  throw new Error('Use dropboxSignInHook in a React component (expo-auth-session)');
}

export async function listDropboxFiles(path = ''): Promise<CloudFile[]> {
  const token = await loadToken('dropbox');
  if (!token) throw new Error('Not signed in to Dropbox');

  const res = await fetch(`${DBX_API_BASE}/files/list_folder`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: path || '', recursive: false }),
  });
  if (res.status === 401) { await clearToken('dropbox'); throw new Error('Dropbox token expired'); }
  if (!res.ok) throw new Error(`Dropbox list failed: ${res.status}`);

  const data = await res.json();
  return (data.entries ?? []).map((e: any): CloudFile => ({
    id: e.id ?? e.path_lower,
    name: e.name,
    mimeType: '',
    size: e.size,
    modifiedAt: e.server_modified,
    isFolder: e['.tag'] === 'folder',
    parentId: e.path_lower?.split('/').slice(0, -1).join('/') || '',
  }));
}

export async function getDropboxStreamUrl(path: string): Promise<string> {
  const token = await loadToken('dropbox');
  if (!token) throw new Error('Not signed in to Dropbox');

  const res = await fetch(`${DBX_API_BASE}/files/get_temporary_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error(`Dropbox get_temporary_link failed: ${res.status}`);
  const data = await res.json();
  return data.link as string;
}

// ─── CloudFile → MediaItem ────────────────────────────────────────────────────

const AUDIO_EXTS = new Set(['mp3','wav','flac','aac','m4a','ogg','wma','opus']);
const VIDEO_EXTS = new Set(['mp4','mkv','avi','mov','wmv','flv','webm','mpg','mpeg','m4v']);

export function cloudFileToMediaItem(
  file: CloudFile,
  streamUrl: string
): MediaItem | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!AUDIO_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) return null;

  return {
    id: file.id,
    title: file.name.replace(/\.[^.]+$/, ''),
    path: streamUrl,
    uri: streamUrl,
    type: VIDEO_EXTS.has(ext) ? 'video' : 'audio',
    thumbnail: file.thumbnailUrl,
    addedAt: Date.now(),
  };
}
