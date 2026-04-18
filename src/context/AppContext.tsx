import { ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Dua } from "../data/rabbanas";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Language = "en" | "ur" | "bn";

export interface PrintItem {
  dua: Dua;
  includeArabic: boolean;
  includeTransliteration: boolean;
  includeTranslation: boolean;
  includeReference: boolean;
}

export interface AccentColor {
  l: string;
  v: string;
  t: string;
}

export interface EmojiOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export interface DesignSettings {
  showBismillah: boolean;
  showNumbers: boolean;
  orientation: "portrait" | "landscape";
  blockSpacing: string;
  blockBg: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  accent: AccentColor;
  arabicColor: string;
  translitColor: string;
  translationColor: string;
  borderStyle: string;
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  blockAccent: string;
  emojiOverlays: EmojiOverlay[];
}

export const DEFAULT_DESIGN: DesignSettings = {
  showBismillah: true,
  showNumbers: true,
  orientation: "portrait",
  blockSpacing: "normal",
  blockBg: "#fafafa",
  fontSize: 18,
  fontFamily: "'Amiri', Georgia, serif",
  fontWeight: "400",
  accent: { l: "Navy", v: "#1a5276", t: "#fff" },
  arabicColor: "#1a2749",
  translitColor: "#555555",
  translationColor: "#111111",
  borderStyle: "solid",
  borderWidth: 2,
  borderRadius: 8,
  borderColor: "#1a5276",
  blockAccent: "left-bar",
  emojiOverlays: [],
};

// ── Store ─────────────────────────────────────────────────────────────────────

interface AppStore {
  language: Language;
  setLanguage: (lang: Language) => void;

  printCollection: PrintItem[];
  addToPrint: (dua: Dua) => void;
  removeFromPrint: (id: number) => void;
  updatePrintItem: (id: number, updates: Partial<PrintItem>) => void;
  isInPrint: (id: number) => boolean;
  reorderPrintItems: (items: PrintItem[]) => void;
  clearPrintCollection: () => void;

  design: DesignSettings;
  setDesign: (patch: Partial<DesignSettings>) => void;
  resetDesign: () => void;
}

export const useApp = create<AppStore>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (lang) => set({ language: lang }),

      printCollection: [],

      addToPrint: (dua) =>
        set((state) => {
          if (state.printCollection.find((item) => item.dua.id === dua.id))
            return state;
          return {
            printCollection: [
              ...state.printCollection,
              {
                dua,
                includeArabic: true,
                includeTransliteration: true,
                includeTranslation: true,
                includeReference: true,
              },
            ],
          };
        }),

      removeFromPrint: (id) =>
        set((state) => ({
          printCollection: state.printCollection.filter(
            (item) => item.dua.id !== id
          ),
        })),

      updatePrintItem: (id, updates) =>
        set((state) => ({
          printCollection: state.printCollection.map((item) =>
            item.dua.id === id ? { ...item, ...updates } : item
          ),
        })),

      isInPrint: (id) =>
        get().printCollection.some((item) => item.dua.id === id),

      reorderPrintItems: (items) => set({ printCollection: items }),

      clearPrintCollection: () => set({ printCollection: [] }),

      design: DEFAULT_DESIGN,
      setDesign: (patch) =>
        set((state) => ({ design: { ...state.design, ...patch } })),
      resetDesign: () => set({ design: DEFAULT_DESIGN }),
    }),
    { name: "rabbanas-store" }
  )
);

// No-op provider — Zustand needs no React context provider.
// Kept so App.tsx requires no changes.
export function AppProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
