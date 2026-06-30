import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, detectDefaultLang, getT, TranslationKeys } from '../i18n';

const STORAGE_KEY = 'app_lang';

interface LangState {
  lang: Lang;
  t: (key: TranslationKeys) => string;
  toggle: () => void;
  load: () => Promise<void>;
}

function buildT(lang: Lang) {
  return getT(lang);
}

export const useLangStore = create<LangState>((set, get) => {
  const defaultLang = detectDefaultLang();

  return {
    lang: defaultLang,
    t: buildT(defaultLang),

    toggle: () => {
      const next: Lang = get().lang === 'zh' ? 'en' : 'zh';
      set({ lang: next, t: buildT(next) });
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    },

    load: async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'zh' || saved === 'en') {
          set({ lang: saved, t: buildT(saved) });
        }
      } catch {}
    },
  };
});
