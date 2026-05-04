import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { RABBANA_META, Dua } from '../data/rabbanas';
import { fetchVerseContentBatch } from '../services/quranApi';

interface QuranContentContextType {
  duas: Dua[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const QuranContentContext = createContext<QuranContentContextType>({
  duas: [],
  isLoading: true,
  error: null,
  retry: () => {},
});

const CACHE_KEY = 'duaflow-content-v2';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function readCache(): Dua[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, duas } = JSON.parse(raw) as { ts: number; duas: Dua[] };
    return Date.now() - ts < CACHE_TTL ? duas : null;
  } catch {
    return null;
  }
}

function writeCache(duas: Dua[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), duas }));
  } catch { /* storage quota exceeded — skip silently */ }
}

export function QuranContentProvider({ children }: { children: ReactNode }) {
  const cached = readCache();
  const [duas, setDuas] = useState<Dua[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (readCache() && tick === 0) return; // fresh cache on first mount — skip fetch

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const contents = await fetchVerseContentBatch(
          RABBANA_META.map(m => ({ surah: m.surah, ayah: m.ayah }))
        );
        if (cancelled) return;

        const loaded = RABBANA_META
          .map((meta, i) => (contents[i] ? { ...meta, ...contents[i]! } : null))
          .filter((d): d is Dua => d !== null);

        setDuas(loaded);
        writeCache(loaded);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load duas');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  const retry = useCallback(() => setTick(t => t + 1), [])
  const value = useMemo(() => ({ duas, isLoading, error, retry }), [duas, isLoading, error, retry])

  return (
    <QuranContentContext.Provider value={value}>
      {children}
    </QuranContentContext.Provider>
  );
}

export function useQuranContent() {
  return useContext(QuranContentContext);
}
