/**
 * Vercel serverless function — proxies bookmark requests to the Quran
 * Foundation User API to avoid CORS issues in production.
 *
 * Supports: GET (list), POST (add), DELETE (remove by id).
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  const { apiBaseUrl, clientId } = getQfOAuthConfig()
  const BASE = `${apiBaseUrl}/auth/v1/bookmarks`

  // Forward user auth headers from the browser
  const headers = {
    'x-auth-token': req.headers['x-auth-token'] ?? '',
    'x-client-id':  req.headers['x-client-id']  ?? clientId,
  }

  // Build URL — DELETE passes bookmark id as path segment
  // e.g. /api/bookmarks/abc123 → DELETE BASE/abc123
  const segments   = (req.url ?? '').replace(/^\/api\/bookmarks\/?/, '').split('?')
  const bookmarkId = segments[0] || ''
  const qs         = segments[1] ? `?${segments[1]}` : ''
  const url        = bookmarkId ? `${BASE}/${bookmarkId}${qs}` : `${BASE}${qs}`

  const options = { method: req.method, headers }

  if (req.method === 'POST') {
    headers['Content-Type'] = 'application/json'
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  const upstream = await fetch(url, options)

  if (upstream.status === 204) {
    return res.status(204).end()
  }

  const data = await upstream.json().catch(() => null)
  return res.status(upstream.status).json(data)
}
