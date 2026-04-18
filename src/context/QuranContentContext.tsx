import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
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

export function QuranContentProvider({ children }: { children: ReactNode }) {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const contents = await fetchVerseContentBatch(
          RABBANA_META.map((m) => ({ surah: m.surah, ayah: m.ayah }))
        );

        if (cancelled) return;

        const loaded: Dua[] = RABBANA_META.map((meta, i) => {
          const content = contents[i];
          return content
            ? { ...meta, ...content }
            : {
                ...meta,
                arabicText: '',
                transliteration: '',
                translations: { en: '', ur: '', bn: '' },
              };
        });

        setDuas(loaded);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load duas from API');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  const retry = () => setTick((t) => t + 1);

  return (
    <QuranContentContext.Provider value={{ duas, isLoading, error, retry }}>
      {children}
    </QuranContentContext.Provider>
  );
}

export function useQuranContent() {
  return useContext(QuranContentContext);
}
