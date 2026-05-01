/**
 * Vercel serverless function — proxies bookmark requests to the QF User API.
 * GET /api/bookmarks         — list bookmarks
 * POST /api/bookmarks        — add bookmark
 * DELETE /api/bookmarks/:id  — remove bookmark
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  const { apiBaseUrl, clientId } = getQfOAuthConfig()
  const BASE = `${apiBaseUrl}/auth/v1/bookmarks`

  const headers = {
    'x-auth-token': req.headers['x-auth-token'] ?? '',
    'x-client-id':  req.headers['x-client-id']  ?? clientId,
  }

  const [pathPart, queryPart] = (req.url ?? '').replace(/^\/api\/bookmarks\/?/, '').split('?')
  const url = pathPart
    ? `${BASE}/${pathPart}${queryPart ? `?${queryPart}` : ''}`
    : `${BASE}${queryPart ? `?${queryPart}` : ''}`

  if (req.method === 'POST') {
    headers['Content-Type'] = 'application/json'
  }

  const upstream = await fetch(url, {
    method:  req.method,
    headers,
    body:    req.method === 'POST' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
    signal:  AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!upstream) return res.status(502).json({ error: 'Upstream request failed' })
  if (upstream.status === 204) return res.status(204).end()

  const data = await upstream.json().catch(() => null)
  return res.status(upstream.status).json(data)
}
