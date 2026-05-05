/**
 * GET  /api/bookmarks  — list bookmarks
 * POST /api/bookmarks  — add bookmark
 *
 * DELETE /api/bookmarks/:id is handled by api/bookmarks/[id].js
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { apiBaseUrl, clientId } = getQfOAuthConfig()

  // Bookmark data is user-specific — never cache
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')

  const headers = {
    'x-auth-token':  req.headers['x-auth-token'] ?? '',
    'x-client-id':   req.headers['x-client-id']  ?? clientId,
    'Cache-Control': 'no-cache',
    'Pragma':        'no-cache',
  }

  const queryPart = (req.url ?? '').split('?')[1]
  const url = `${apiBaseUrl}/auth/v1/bookmarks${queryPart ? `?${queryPart}` : ''}`

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
  if (upstream.status === 304) return res.status(200).json([])

  const data = await upstream.json().catch(() => null)
  return res.status(upstream.status).json(data)
}
