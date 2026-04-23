/**
 * Quran Foundation Content API service
 * Docs: https://api-docs.quran.foundation
 * Hackathon: https://launch.provisioncapital.com/quran-hackathon
 */

// ── Config ────────────────────────────────────────────────────────────────────
// Values come from .env — see .env.example for the required keys.

const CLIENT_ID = import.meta.env.VITE_QURAN_CLIENT_ID ?? '';
// Use /quran-oauth proxy to avoid CORS on the token endpoint (Vite proxies this to prelive-oauth2.quran.foundation)
const OAUTH_URL     = import.meta.env.VITE_QURAN_OAUTH_URL     ?? '/api/token';
const API_BASE      = import.meta.env.VITE_QURAN_API_BASE      ?? 'https://apis.quran.foundation/content/api/v4';

// Translation resource IDs
const TRANSLATION_EN    = 85;   // M.A.S. Abdel Haleem (English)
const TRANSLATION_UR    = 234;  // Fatah Muhammad Jalandhari (Urdu)
const TRANSLATION_BN    = 161;  // Taisirul Quran — Tawheed Publication (Bengali)
const TRANSLITERATION   = 57;   // Transliteration

// ── Token cache ───────────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiry = 0;
const _notFound = new Set<string>();

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const resp = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=content',
  });

  if (!resp.ok) {
    throw new Error(`OAuth failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  _cachedToken = data.access_token as string;
  // Expire 2 minutes before actual expiry to avoid edge cases
  _tokenExpiry = Date.now() + (data.expires_in - 120) * 1000;
  return _cachedToken;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VerseContent {
  arabicText: string;
  transliteration: string;
  translations: { en: string; ur: string; bn: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch Arabic text, transliteration, and translations for a single verse.
 */
export async function fetchVerseContent(
  surah: number,
  ayah: number
): Promise<VerseContent | null> {
  const key = `${surah}:${ayah}`;
  if (_notFound.has(key)) return null;

  const token = await getToken();
  const ids = [TRANSLATION_EN, TRANSLATION_UR, TRANSLATION_BN, TRANSLITERATION].join(',');

  const resp = await fetch(
    `${API_BASE}/verses/by_key/${key}?translations=${ids}&fields=text_uthmani`,
    {
      headers: {
        'x-auth-token': token,
        'x-client-id': CLIENT_ID,
      },
    }
  );

  if (resp.status === 404) {
    _notFound.add(key);
    return null;
  }

  if (!resp.ok) {
    throw new Error(`Verse fetch failed: ${surah}:${ayah} — ${resp.status}`);
  }

  const data = await resp.json();
  const verse = data.verse;
  const translations: Array<{ resource_id: number; text: string }> =
    verse.translations ?? [];

  const find = (id: number) => {
    const match = translations.find((t) => t.resource_id === id);
    return match ? stripHtml(match.text) : '';
  };

  return {
    arabicText: verse.text_uthmani ?? '',
    transliteration: find(TRANSLITERATION),
    translations: {
      en: find(TRANSLATION_EN),
      ur: find(TRANSLATION_UR),
      bn: find(TRANSLATION_BN),
    },
  };
}

/**
 * Fetch content for multiple verses concurrently, in batches to avoid
 * overwhelming the API during initial load.
 */
export async function fetchVerseContentBatch(
  verses: Array<{ surah: number; ayah: number }>
): Promise<(VerseContent | null)[]> {
  const BATCH_SIZE = 5;
  const results: (VerseContent | null)[] = new Array(verses.length).fill(null);

  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((v) => fetchVerseContent(v.surah, v.ayah))
    );
    settled.forEach((result, j) => {
      results[i + j] = result.status === 'fulfilled' ? result.value : null;
    });
  }

  return results;
}
