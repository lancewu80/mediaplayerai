import { getLocales } from 'expo-localization';
import en, { TranslationKeys } from './en';
import zh from './zh';

export type Lang = 'zh' | 'en';

/** Locales that default to Traditional Chinese */
const ZH_REGIONS = new Set(['TW', 'HK', 'MO', 'CN']);

/**
 * Detect the device's locale and return the default language.
 * zh-TW, zh-HK, zh-MO, zh-CN  → 'zh'
 * everything else               → 'en'
 */
export function detectDefaultLang(): Lang {
  try {
    const locales = getLocales();
    for (const loc of locales) {
      const lang   = (loc.languageCode ?? '').toLowerCase();
      const region = (loc.regionCode ?? '').toUpperCase();

      if (lang === 'zh') {
        // Any Chinese locale → Traditional Chinese UI
        // (we use Traditional Chinese copy for zh-CN users too — easy to swap later)
        return 'zh';
      }
      // Some devices report full tag like "zh-TW" without splitting
      if (region && ZH_REGIONS.has(region)) return 'zh';
    }
  } catch {}
  return 'en';
}

const TRANSLATIONS: Record<Lang, Record<TranslationKeys, string>> = { en, zh };

/**
 * Returns a translate function bound to the given language.
 * Usage:  const t = getT('zh');  t('addFiles') // → '加入檔案'
 */
export function getT(lang: Lang) {
  return (key: TranslationKeys): string =>
    TRANSLATIONS[lang][key] ?? TRANSLATIONS['en'][key] ?? key;
}

export { TranslationKeys };
