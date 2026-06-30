import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_theme';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  load: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true, // default dark

  toggle: () => {
    const next = !get().isDark;
    set({ isDark: next });
    AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
  },

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light') set({ isDark: false });
      if (saved === 'dark')  set({ isDark: true });
    } catch {}
  },
}));
