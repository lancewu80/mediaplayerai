import { create } from 'zustand';
import { MediaItem, Playlist, SUPPORTED_AUDIO_FORMATS, SUPPORTED_VIDEO_FORMATS } from '../types';

interface PlaylistStore {
  playlists: Playlist[];
  activePlaylistId: string;
  activePlaylist: Playlist | null;

  createPlaylist: (name: string) => string;
  setActivePlaylist: (id: string) => void;
  addItems: (items: MediaItem[]) => void;
  removeItem: (itemId: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  clearPlaylist: () => void;
  importPlaylist: (playlist: Playlist) => void;
  exportPlaylist: () => Playlist | null;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  getNextItem: (currentIndex: number, shuffle: boolean) => { item: MediaItem; index: number } | null;
  getPrevItem: (currentIndex: number) => { item: MediaItem; index: number } | null;
  getFirstItem: () => { item: MediaItem; index: number } | null;
  getLastItem: () => { item: MediaItem; index: number } | null;
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getMediaType(path: string): 'audio' | 'video' {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_VIDEO_FORMATS.includes(ext) ? 'video' : 'audio';
}

const DEFAULT_PLAYLIST: Playlist = {
  id: 'default',
  name: 'My Playlist',
  items: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [DEFAULT_PLAYLIST],
  activePlaylistId: 'default',
  activePlaylist: DEFAULT_PLAYLIST,

  createPlaylist: (name) => {
    const id = makeId();
    const pl: Playlist = { id, name, items: [], createdAt: Date.now(), updatedAt: Date.now() };
    set((s) => ({ playlists: [...s.playlists, pl] }));
    return id;
  },

  setActivePlaylist: (id) => {
    const pl = get().playlists.find((p) => p.id === id) ?? null;
    set({ activePlaylistId: id, activePlaylist: pl });
  },

  addItems: (items) => {
    set((s) => {
      const playlists = s.playlists.map((pl) => {
        if (pl.id !== s.activePlaylistId) return pl;
        const existingPaths = new Set(pl.items.map((i) => i.path));
        const newItems = items.filter((i) => !existingPaths.has(i.path));
        const updated = { ...pl, items: [...pl.items, ...newItems], updatedAt: Date.now() };
        return updated;
      });
      const active = playlists.find((p) => p.id === s.activePlaylistId) ?? null;
      return { playlists, activePlaylist: active };
    });
  },

  removeItem: (itemId) => {
    set((s) => {
      const playlists = s.playlists.map((pl) => {
        if (pl.id !== s.activePlaylistId) return pl;
        return { ...pl, items: pl.items.filter((i) => i.id !== itemId), updatedAt: Date.now() };
      });
      const active = playlists.find((p) => p.id === s.activePlaylistId) ?? null;
      return { playlists, activePlaylist: active };
    });
  },

  moveItem: (from, to) => {
    set((s) => {
      const playlists = s.playlists.map((pl) => {
        if (pl.id !== s.activePlaylistId) return pl;
        const items = [...pl.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...pl, items, updatedAt: Date.now() };
      });
      const active = playlists.find((p) => p.id === s.activePlaylistId) ?? null;
      return { playlists, activePlaylist: active };
    });
  },

  clearPlaylist: () => {
    set((s) => {
      const playlists = s.playlists.map((pl) => {
        if (pl.id !== s.activePlaylistId) return pl;
        return { ...pl, items: [], updatedAt: Date.now() };
      });
      const active = playlists.find((p) => p.id === s.activePlaylistId) ?? null;
      return { playlists, activePlaylist: active };
    });
  },

  importPlaylist: (playlist) => {
    set((s) => {
      const exists = s.playlists.find((p) => p.id === playlist.id);
      const playlists = exists
        ? s.playlists.map((p) => (p.id === playlist.id ? playlist : p))
        : [...s.playlists, playlist];
      return { playlists, activePlaylistId: playlist.id, activePlaylist: playlist };
    });
  },

  exportPlaylist: () => {
    const { playlists, activePlaylistId } = get();
    return playlists.find((p) => p.id === activePlaylistId) ?? null;
  },

  renamePlaylist: (id, name) => {
    set((s) => {
      const playlists = s.playlists.map((pl) =>
        pl.id === id ? { ...pl, name, updatedAt: Date.now() } : pl
      );
      const active = playlists.find((p) => p.id === s.activePlaylistId) ?? null;
      return { playlists, activePlaylist: active };
    });
  },

  deletePlaylist: (id) => {
    set((s) => {
      if (s.playlists.length <= 1) return s;
      const playlists = s.playlists.filter((p) => p.id !== id);
      const newActiveId = s.activePlaylistId === id ? playlists[0].id : s.activePlaylistId;
      const active = playlists.find((p) => p.id === newActiveId) ?? null;
      return { playlists, activePlaylistId: newActiveId, activePlaylist: active };
    });
  },

  getNextItem: (currentIndex, shuffle) => {
    const items = get().activePlaylist?.items ?? [];
    if (!items.length) return null;
    let index: number;
    if (shuffle) {
      index = Math.floor(Math.random() * items.length);
    } else {
      index = (currentIndex + 1) % items.length;
    }
    return { item: items[index], index };
  },

  getPrevItem: (currentIndex) => {
    const items = get().activePlaylist?.items ?? [];
    if (!items.length) return null;
    const index = (currentIndex - 1 + items.length) % items.length;
    return { item: items[index], index };
  },

  getFirstItem: () => {
    const items = get().activePlaylist?.items ?? [];
    if (!items.length) return null;
    return { item: items[0], index: 0 };
  },

  getLastItem: () => {
    const items = get().activePlaylist?.items ?? [];
    if (!items.length) return null;
    return { item: items[items.length - 1], index: items.length - 1 };
  },
}));
