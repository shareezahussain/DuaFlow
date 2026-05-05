import { ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Dua } from "../data/rabbanas";
import { QFBookmark, startLogin as pkceStartLogin, fetchBookmarks, fetchUserProfile, decodeJwtPayload, refreshAccessToken } from "../services/bookmarksApi";

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
  accent: { l: "green", v: "#1a5276", t: "#fff" },
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

// ── Recently-deleted filter ───────────────────────────────────────────────────
//
// The QF GET endpoint has server-side caching — a successful DELETE is NOT
// reflected in GET responses for several minutes (confirmed via curl: deleted
// bookmark still appears 30 s after DELETE returns 200 success).
//
// We persist deleted IDs to localStorage so the filter survives page reloads
// and sign-out → sign-in within the same cache window.
// TTL = 10 min (longer than the observed cache window). Clears automatically.

const DELETED_CACHE_KEY = 'duaflow-deleted-ids'
const DELETED_CACHE_TTL = 10 * 60 * 1_000

function loadDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CACHE_KEY)
    if (!raw) return new Set()
    const { ids, ts }: { ids: string[]; ts: number } = JSON.parse(raw)
    if (Date.now() - ts > DELETED_CACHE_TTL) { localStorage.removeItem(DELETED_CACHE_KEY); return new Set() }
    return new Set(ids)
  } catch { return new Set() }
}

function saveDeletedIds(set: Set<string>) {
  try { localStorage.setItem(DELETED_CACHE_KEY, JSON.stringify({ ids: [...set], ts: Date.now() })) } catch { /* quota */ }
}

const _deletedIds: Set<string> = loadDeletedIds()

// ── Helpers ───────────────────────────────────────────────────────────────────

function bookmarksToMap(bookmarks: QFBookmark[]): Record<string, string> {
  const map: Record<string, string> = {};
  bookmarks.forEach(b => {
    if (!b.key || !b.verseNumber || !b.id) return;
    if (_deletedIds.has(b.id)) return; // server cache still returning this — ignore
    map[`${b.key}:${b.verseNumber}`] = b.id;
  });
  return map;
}

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
  updateBookmarkMap: (updater: (current: Record<string, string>) => Record<string, string>) => void;
  isBookmarked: (surah: number, ayah: number) => boolean;
  loadBookmarks: (token?: string) => Promise<void>;
  flagBookmarkDeleted: (bookmarkApiId: string) => void;
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
        const raw = localStorage.getItem(`duaflow-user-${userId}`);
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            set({ userId, printCollection: saved.printCollection ?? [], design: { ...DEFAULT_DESIGN, ...(saved.design ?? {}) } });
            return;
          } catch { /* fall through */ }
        }
        set({ userId, printCollection: [], design: DEFAULT_DESIGN });
      },
      applyAuthTokens: async ({ access_token, refresh_token, id_token }) => {
        set({ userToken: access_token });
        if (refresh_token) set({ refreshToken: refresh_token });

        const sub = decodeJwtPayload(access_token)?.sub as string | undefined;
        if (sub) get().loadUserProfile(sub);

        const candidates = [id_token, access_token].filter((t): t is string => !!t);
        const name = candidates.reduce<string | null>((found, tok) => {
          if (found) return found;
          const p = decodeJwtPayload(tok);
          return ((p?.name ?? p?.given_name ?? p?.first_name ?? p?.preferred_username ?? (p?.email as string | undefined)?.split('@')[0]) as string) || null;
        }, null);
        const picture = candidates.map(t => decodeJwtPayload(t)?.picture as string | undefined).find(Boolean) ?? null;

        if (name) {
          set({ userName: name, userPicture: picture ?? null });
        } else {
          try {
            const profile = await fetchUserProfile(access_token);
            set({
              userName: (profile.name ?? profile.given_name ?? profile.first_name ?? profile.preferred_username ?? profile.email?.split('@')[0]) ?? null,
              userPicture: profile.picture ?? null,
            });
          } catch { /* non-fatal */ }
        }

        await get().loadBookmarks(access_token);
      },
      fetchAndSetUserName: async () => {
        const { userToken } = get();
        if (!userToken) return;
        const p = decodeJwtPayload(userToken);
        const name = ((p?.name ?? p?.given_name ?? p?.first_name ?? p?.preferred_username ?? (p?.email as string | undefined)?.split('@')[0]) as string) || null;
        if (name) { set({ userName: name, userPicture: (p?.picture as string | null) ?? null }); return; }
        try {
          const profile = await fetchUserProfile(userToken);
          set({
            userName: (profile.name ?? profile.given_name ?? profile.first_name ?? profile.preferred_username ?? profile.email?.split('@')[0]) ?? null,
            userPicture: profile.picture ?? null,
          });
        } catch (e) { console.error('fetchUserProfile failed:', e); }
      },
      startLogin: async () => {
        const tokens = await pkceStartLogin();
        await get().applyAuthTokens(tokens);
      },
      signOut: () => {
        const { userId, printCollection, design } = get();
        if (userId) {
          localStorage.setItem(`duaflow-user-${userId}`, JSON.stringify({ printCollection, design }));
        }
        ['pkce_verifier', 'pkce_state', 'pkce_nonce', 'pkce_redirect_uri'].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('qf_force_login', '1');
        set({ userToken: null, refreshToken: null, bookmarkMap: {}, userId: null, userName: null, userPicture: null, printCollection: [], design: DEFAULT_DESIGN });
      },

      // Bookmarks
      bookmarkMap: {},
      updateBookmarkMap: (updater) =>
        set(state => ({ bookmarkMap: updater(state.bookmarkMap) })),
      isBookmarked: (surah, ayah) => `${surah}:${ayah}` in get().bookmarkMap,
      loadBookmarks: async (token) => {
        const t = token ?? get().userToken;
        if (!t) return;
        try {
          const { refreshToken, setUserToken } = get();
          const refreshFn = refreshToken
            ? async () => { const newToken = await refreshAccessToken(refreshToken); setUserToken(newToken); return newToken; }
            : undefined;
          const bookmarks = await fetchBookmarks(t, refreshFn);
          set({ bookmarkMap: bookmarksToMap(bookmarks) });
        } catch (e) {
          // Sign out on any auth failure so the user sees the sign-in prompt
          // instead of appearing logged-in with zero bookmarks.
          // Covers: expired access token (401), expired refresh token, inactive token.
          const msg = e instanceof Error ? e.message : ''
          // Extract HTTP status from error message and sign out on any 4xx auth failure.
          // QF API returns: 400 (malformed token), 401 (invalid), 403 (expired/inactive).
          const status = parseInt(msg.match(/\d{3}/)?.[0] ?? '0')
          const isAuthFailure = (status >= 400 && status < 500) || msg.includes('refresh')
          if (isAuthFailure) get().signOut()
        }
      },
      flagBookmarkDeleted: (bookmarkApiId) => {
        _deletedIds.add(bookmarkApiId);
        saveDeletedIds(_deletedIds);
        setTimeout(() => {
          _deletedIds.delete(bookmarkApiId);
          saveDeletedIds(_deletedIds);
        }, DELETED_CACHE_TTL);
      },
    }),
    {
      name: "duaflow-store",
      partialize: (state) => {
        const { refreshToken: _rt, bookmarkMap: _bm, ...rest } = state;
        return rest;
      },
    }
  )
);

// No-op provider — Zustand needs no React context provider.
export function AppProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
