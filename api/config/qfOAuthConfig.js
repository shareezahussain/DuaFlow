/**
 * Quran Foundation OAuth2 client configuration.
 *
 * Reads server-only environment variables (no VITE_ prefix — never sent to
 * the browser). The client_secret is intentionally kept here and never logged.
 *
 * This client is a CONFIDENTIAL client (has client_secret). The token
 * exchange must always happen server-side (Vercel API routes), never in
 * browser code.
 *
 * To request or update client credentials:
 * https://api-docs.quran.foundation/request-access
 */

const ENV_URLS = {
  prelive: {
    authBaseUrl: 'https://prelive-oauth2.quran.foundation',
    apiBaseUrl:  'https://apis-prelive.quran.foundation',
  },
  production: {
    authBaseUrl: 'https://oauth2.quran.foundation',
    apiBaseUrl:  'https://apis.quran.foundation',
  },
}

/**
 * Returns the resolved QF OAuth configuration.
 * Throws if QF_CLIENT_ID is missing.
 *
 * @returns {{ env: string, clientId: string, clientSecret: string|undefined, authBaseUrl: string, apiBaseUrl: string }}
 */
export function getQfOAuthConfig() {
  const clientId = process.env.VITE_QURAN_CLIENT_ID

  if (!clientId) {
    throw new Error(
      'Missing Quran Foundation API credentials. Request access: https://api-docs.quran.foundation/request-access'
    )
  }

  const env          = process.env.QF_ENV === 'production' ? 'production' : 'prelive'
  const clientSecret = process.env.QF_CLIENT_SECRET
  const { authBaseUrl, apiBaseUrl } = ENV_URLS[env]

  return { env, clientId, clientSecret, authBaseUrl, apiBaseUrl }
}
