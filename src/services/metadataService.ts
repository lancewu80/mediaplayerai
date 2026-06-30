/**
 * Metadata Service — TMDB (The Movie Database)
 *
 * Automatically fetches:
 *   • Movie poster (thumbnail)
 *   • Synopsis / overview
 *   • Director, cast, genre, year, rating
 *
 * Free API key: https://www.themoviedb.org/settings/api
 * Rate limit: 50 requests/second (generous for local use)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../config/appConfig';
import { MediaItem } from '../types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w300';   // poster size

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: string;
  genres: string[];
  rating: number;
  director?: string;
  cast?: string[];
}

export interface TMDBEpisode {
  show: string;
  season?: number;
  episode?: number;
  overview?: string;
  stillUrl?: string | null;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cacheKey = (title: string) => `@tmdb/${encodeURIComponent(title.toLowerCase())}`;

async function getCached(title: string): Promise<TMDBMovie | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(title));
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    const maxAge = AppConfig.metadata.cacheDays * 86_400_000;
    if (Date.now() - savedAt > maxAge) return null;
    return data;
  } catch {
    return null;
  }
}

async function setCache(title: string, data: TMDBMovie): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(title), JSON.stringify({ data, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function apiKey() { return AppConfig.metadata.tmdbApiKey; }

async function tmdbGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const key = apiKey();
  if (!key) throw new Error('TMDB API key not set. Add EXPO_PUBLIC_TMDB_API_KEY to .env');

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
  return res.json();
}

// ─── Movie search ─────────────────────────────────────────────────────────────

export async function searchMovie(title: string): Promise<TMDBMovie | null> {
  if (!apiKey()) return null;

  const cached = await getCached(title);
  if (cached) return cached;

  const searchData = await tmdbGet('/search/movie', { query: title });
  const result = searchData.results?.[0];
  if (!result) return null;

  // Fetch credits for director & cast
  let director: string | undefined;
  let cast: string[] = [];
  try {
    const credits = await tmdbGet(`/movie/${result.id}/credits`);
    director = credits.crew?.find((c: any) => c.job === 'Director')?.name;
    cast = credits.cast?.slice(0, 5).map((c: any) => c.name) ?? [];
  } catch { /* non-critical */ }

  const movie: TMDBMovie = {
    id: result.id,
    title: result.title,
    overview: result.overview ?? '',
    posterUrl: result.poster_path ? `${IMG_BASE}${result.poster_path}` : null,
    backdropUrl: result.backdrop_path ? `${IMG_BASE}${result.backdrop_path}` : null,
    releaseYear: result.release_date?.slice(0, 4) ?? '',
    genres: [],   // genre_ids → names requires /genre/movie/list — done lazily
    rating: result.vote_average ?? 0,
    director,
    cast,
  };

  await setCache(title, movie);
  return movie;
}

// ─── TV show search ───────────────────────────────────────────────────────────

export async function searchTVShow(title: string): Promise<TMDBMovie | null> {
  if (!apiKey()) return null;

  const data = await tmdbGet('/search/tv', { query: title });
  const result = data.results?.[0];
  if (!result) return null;

  return {
    id: result.id,
    title: result.name,
    overview: result.overview ?? '',
    posterUrl: result.poster_path ? `${IMG_BASE}${result.poster_path}` : null,
    backdropUrl: result.backdrop_path ? `${IMG_BASE}${result.backdrop_path}` : null,
    releaseYear: result.first_air_date?.slice(0, 4) ?? '',
    genres: [],
    rating: result.vote_average ?? 0,
  };
}

// ─── Auto-enrich a MediaItem ──────────────────────────────────────────────────

/**
 * Tries to find metadata for a video MediaItem and patches it in-place.
 * Silently returns the unmodified item if TMDB is unavailable or key is missing.
 */
export async function enrichMediaItem(item: MediaItem): Promise<MediaItem> {
  if (!AppConfig.metadata.autoFetch) return item;
  if (item.type !== 'video') return item;
  if (!apiKey()) return item;

  try {
    const meta = await searchMovie(item.title) ?? await searchTVShow(item.title);
    if (!meta) return item;

    return {
      ...item,
      thumbnail: item.thumbnail ?? meta.posterUrl ?? undefined,
      year:      item.year ?? (meta.releaseYear ? Number(meta.releaseYear) : undefined),
      genre:     item.genre ?? meta.genres[0],
    };
  } catch {
    return item;
  }
}

// ─── Batch enrich ─────────────────────────────────────────────────────────────

/**
 * Enriches a list of MediaItems in batches (to respect rate limits).
 * Calls `onProgress(index, total)` after each item.
 */
export async function enrichBatch(
  items: MediaItem[],
  onProgress?: (done: number, total: number) => void
): Promise<MediaItem[]> {
  const results: MediaItem[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(await enrichMediaItem(items[i]));
    onProgress?.(i + 1, items.length);
    // Small delay to avoid hammering TMDB
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, 80));
  }
  return results;
}
