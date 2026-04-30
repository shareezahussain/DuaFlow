import { ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Dua, RABBANA_META } from "../data/rabbanas";
import { startLogin as pkceStartLogin, fetchBookmarks, fetchUserProfile, decodeJwtPayload } from "../services/bookmarksApi";

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

  // Auth
  userToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userName: string | null;
  userPicture: string | null;
  setUserToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  loadUserProfile: (userId: string) => void;
  applyAuthTokens: (tokens: { access_token: string; refresh_token?: string; id_token?: string }) => Promise<void>;
  fetchAndSetUserName: () => Promise<void>;
  startLogin: () => Promise<void>;
  signOut: () => void;

  // Bookmarks — duaId -> QF bookmark ID
  bookmarkMap: Record<string, string>;
  setBookmarkMap: (map: Record<string, string>) => void;
  isBookmarked: (duaId: number) => boolean;
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

      // Auth
      userToken: null,
      refreshToken: null,
      userId: null,
      userName: null,
      userPicture: null,
      setUserToken: (token) => set({ userToken: token }),
      setRefreshToken: (token) => set({ refreshToken: token }),
      loadUserProfile: (userId) => {
        const raw = localStorage.getItem(`duaflow-user-${userId}`)
        if (raw) {
          try {
            const saved = JSON.parse(raw)
            set({ userId, printCollection: saved.printCollection ?? [], design: { ...DEFAULT_DESIGN, ...(saved.design ?? {}) } })
            return
          } catch { /* fall through */ }
        }
        set({ userId, printCollection: [], design: DEFAULT_DESIGN })
      },
      applyAuthTokens: async ({ access_token, refresh_token, id_token }) => {
        set({ userToken: access_token })
        if (refresh_token) set({ refreshToken: refresh_token })

        // Restore per-user print/design settings
        const sub = decodeJwtPayload(access_token)?.sub as string | undefined
        if (sub) get().loadUserProfile(sub)

        // Extract name + picture — try id_token first, access_token as fallback
        const candidates = [id_token, access_token].filter((t): t is string => !!t)
        const name = candidates.reduce<string | null>((found, tok) => {
          if (found) return found
          const p = decodeJwtPayload(tok)
          return ((p?.name ?? p?.given_name ?? p?.first_name ?? p?.preferred_username ?? (p?.email as string | undefined)?.split('@')[0]) as string) || null
        }, null)
        const picture = candidates.map(t => decodeJwtPayload(t)?.picture as string | undefined).find(Boolean) ?? null

        if (name) {
          set({ userName: name, userPicture: picture ?? null })
        } else {
          try {
            const profile = await fetchUserProfile(access_token)
            set({
              userName: (profile.name ?? profile.given_name ?? profile.first_name ?? profile.preferred_username ?? profile.email?.split('@')[0]) ?? null,
              userPicture: profile.picture ?? null,
            })
          } catch { /* non-fatal */ }
        }

        // Load bookmarks
        try {
          const bookmarks = await fetchBookmarks(access_token)
          const map: Record<string, string> = {}
          bookmarks.forEach(b => {
            if (!b.key || !b.verseNumber || !b.id) return
            RABBANA_META
              .filter(m => m.surah === b.key && m.ayah === b.verseNumber)
              .forEach(m => { map[String(m.id)] = b.id })
          })
          set({ bookmarkMap: map })
        } catch { /* non-fatal */ }
      },
      fetchAndSetUserName: async () => {
        const { userToken } = get()
        if (!userToken) return
        const p = decodeJwtPayload(userToken)
        const name = ((p?.name ?? p?.given_name ?? p?.first_name ?? p?.preferred_username ?? (p?.email as string | undefined)?.split('@')[0]) as string) || null
        if (name) { set({ userName: name, userPicture: (p?.picture as string | null) ?? null }); return }
        try {
          const profile = await fetchUserProfile(userToken)
          set({
            userName: (profile.name ?? profile.given_name ?? profile.first_name ?? profile.preferred_username ?? profile.email?.split('@')[0]) ?? null,
            userPicture: profile.picture ?? null,
          })
        } catch (e) { console.error('fetchUserProfile failed:', e) }
      },
      startLogin: async () => {
        const tokens = await pkceStartLogin()
        await get().applyAuthTokens(tokens)
      },
      signOut: () => {
        const { userId, printCollection, design } = get()
        if (userId) {
          localStorage.setItem(`duaflow-user-${userId}`, JSON.stringify({ printCollection, design }))
        }
        ['pkce_verifier', 'pkce_state', 'pkce_nonce', 'pkce_redirect_uri'].forEach(k => localStorage.removeItem(k))
        localStorage.setItem('qf_force_login', '1')
        set({ userToken: null, refreshToken: null, bookmarkMap: {}, userId: null, userName: null, userPicture: null, printCollection: [], design: DEFAULT_DESIGN })
      },

      // Bookmarks
      bookmarkMap: {},
      setBookmarkMap: (map) => set({ bookmarkMap: map }),
      isBookmarked: (duaId) =>
        String(duaId) in get().bookmarkMap,
    }),
    {
      name: "duaflow-store",
      // Never persist refreshToken — keep it in memory only (spec requirement)
      partialize: (state) => {
        const { refreshToken: _rt, ...rest } = state;
        return rest;
      },
    }
  )
);

// No-op provider — Zustand needs no React context provider.
export function AppProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
