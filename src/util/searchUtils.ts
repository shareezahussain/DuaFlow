import type { Dua } from '../data/rabbanas';

export function sanitizeSearchInput(search: string) {
  return search.toLowerCase().trim();
}

export function sanitizeDuaFields(d: Dua) {
  return {
    topic: d.topic?.toLowerCase() || "",
    translation: d.translations?.en?.toLowerCase() || "",
    transliteration: d.transliteration?.toLowerCase() || "",
    arabic: d.arabicText || ""
  };
}