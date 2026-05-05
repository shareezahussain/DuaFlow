/**
 * Quran Foundation User API — Bookmarks
 * Docs: https://api-docs.quran.foundation/docs/tutorials/oidc/user-apis-quickstart
 *
 * Uses PKCE OAuth2 authorization-code flow (no client secret required in browser).
 */

const CLIENT_ID   = import.meta.env.VITE_QURAN_CLIENT_ID ?? '';
const OAUTH_AUTH  = `${import.meta.env.VITE_QURAN_AUTH_BASE}/oauth2/auth`;
const BOOKMARKS_URL = '/api/bookmarks';

function getRedirectUri(): string {
  return import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ── Auth flow ─────────────────────────────────────────────────────────────────

const randomHex = (bytes = 16): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface LoginResult {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * Kick off the PKCE authorization-code flow via a popup window.
 * Returns a Promise that resolves with tokens once the user completes login.
 * Falls back to full-page redirect if popups are blocked.
 */
export async function startLogin(): Promise<LoginResult> {
  const verifier    = generateVerifier();
  const challenge   = await generateChallenge(verifier);
  const state       = randomHex();
  const nonce       = randomHex();
  const redirectUri = getRedirectUri();

  localStorage.setItem('pkce_verifier',     verifier);
  localStorage.setItem('pkce_state',        state);
  localStorage.setItem('pkce_nonce',        nonce);
  localStorage.setItem('pkce_redirect_uri', redirectUri);

  const forceLogin = localStorage.getItem('qf_force_login') === '1'
  if (forceLogin) localStorage.removeItem('qf_force_login')

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             CLIENT_ID,
    redirect_uri:          redirectUri,
    scope:                 'openid offline_access bookmark',
    state,
    nonce,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    ...(forceLogin && { prompt: 'login' }),
  });

  const authUrl = `${OAUTH_AUTH}?${params.toString()}`;
  const width   = 500;
  const height  = 650;
  const left    = Math.round(window.screenX + (window.outerWidth  - width)  / 2);
  const top     = Math.round(window.screenY + (window.outerHeight - height) / 2);
  const popup   = window.open(authUrl, 'qf-auth', `width=${width},height=${height},left=${left},top=${top}`);

  if (!popup || popup.closed) {
    // Popup blocked — fall back to full-page redirect (never resolves)
    window.location.href = authUrl;
    return new Promise(() => {});
  }

  return new Promise<LoginResult>((resolve, reject) => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'qf-auth-callback') return;
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve({ access_token: event.data.access_token, refresh_token: event.data.refresh_token, id_token: event.data.id_token });
    }

    const checkClosed = setInterval(() => {
      if (popup.closed) { cleanup(); reject(new Error('Sign-in cancelled')); }
    }, 500);

    function cleanup() {
      window.removeEventListener('message', onMessage);
      clearInterval(checkClosed);
    }

    window.addEventListener('message', onMessage);
  });
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; refresh_token?: string; id_token?: string; expires_in?: number; scope?: string; token_type?: string }> {
  const verifier    = localStorage.getItem('pkce_verifier') ?? '';
  const redirectUri = getRedirectUri();

  if (!verifier) throw new Error('Missing PKCE verifier — please sign in again');

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
    code_verifier: verifier,
  });

  const resp = await fetch('/api/user-token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!resp.ok) {
    throw new Error('Failed to exchange authorization code for tokens');
  }

  localStorage.removeItem('pkce_verifier');
  localStorage.removeItem('pkce_redirect_uri');
  localStorage.removeItem('pkce_state');
  localStorage.removeItem('pkce_nonce');

  return resp.json();
}

// ── Token refresh ─────────────────────────────────────────────────────────────

// Stampede prevention: only one refresh runs at a time per session.
let _refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const resp = await fetch('/api/refresh-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ refresh_token: refreshToken }).toString(),
    });

    if (!resp.ok) throw new Error('Failed to refresh access token');

    const data = await resp.json();
    return data.access_token as string;
  })().finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

// ── Bookmarks API ─────────────────────────────────────────────────────────────

export interface QFBookmark {
  id: string;
  type: string;
  key: number;
  verseNumber?: number;
}

function authHeaders(token: string): Record<string, string> {
  return { 'x-auth-token': token, 'x-client-id': CLIENT_ID };
}

// One refresh + one retry on 401. refreshFn wired in Step 5.
async function authFetch(
  url: string,
  options: RequestInit,
  token: string,
  refreshFn?: () => Promise<string>
): Promise<Response> {
  const resp = await fetch(url, { ...options, headers: { ...options.headers, ...authHeaders(token) } });
  if (resp.status === 401 && refreshFn) {
    const newToken = await refreshFn();
    return fetch(url, { ...options, headers: { ...options.headers, ...authHeaders(newToken) } });
  }
  return resp;
}

export async function fetchBookmarks(token: string, refreshFn?: () => Promise<string>): Promise<QFBookmark[]> {
  const resp = await authFetch(`${BOOKMARKS_URL}?mushafId=1&type=ayah&first=20`, {
    headers: { 'Cache-Control': 'no-cache' },
  }, token, refreshFn);
  // 304 = not modified — caller keeps its existing map
  if (resp.status === 304) return [];
  if (!resp.ok) throw new Error(`Fetch bookmarks failed: ${resp.status}`);
  const data = await resp.json();
  return Array.isArray(data) ? data : (data.data ?? data.bookmarks ?? []);
}

export async function addBookmark(
  token: string,
  surah: number,
  ayah: number,
  refreshFn?: () => Promise<string>
): Promise<QFBookmark> {
  const resp = await authFetch(
    BOOKMARKS_URL,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: surah, verseNumber: ayah, type: 'ayah', mushafId: 1 }) },
    token,
    refreshFn
  );
  if (!resp.ok) throw new Error(`Add bookmark failed: ${resp.status}`);
  const data = await resp.json();
  const bookmark = data.data ?? data;
  return { ...bookmark, id: bookmark.id ?? data.id };
}

export async function removeBookmark(token: string, bookmarkId: string, refreshFn?: () => Promise<string>): Promise<void> {
  const resp = await authFetch(`${BOOKMARKS_URL}/${encodeURIComponent(bookmarkId)}`, { method: 'DELETE' }, token, refreshFn);
  if (!resp.ok) throw new Error(`Remove bookmark failed: ${resp.status}`);
}

// ── User profile ──────────────────────────────────────────────────────────────

export interface QFUserProfile {
  sub: string;
  name?: string;
  given_name?: string;
  first_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
  [key: string]: unknown;
}

/**
 * Fetch the authenticated user's profile via the OIDC userinfo endpoint
 * (proxied through /api/userinfo to avoid CORS).
 */
export async function fetchUserProfile(token: string): Promise<QFUserProfile> {
  const resp = await fetch('/api/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`fetchUserProfile failed: ${resp.status}`);
  return resp.json();
}