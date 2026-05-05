/**
 * DELETE /api/bookmarks/:id — remove a single bookmark.
 *
 * Vercel only auto-routes api/bookmarks.js to /api/bookmarks.
 * Path-parameter requests (/api/bookmarks/:id) need their own file.
 */
import { getQfOAuthConfig } from '../config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { apiBaseUrl, clientId } = getQfOAuthConfig()
  const bookmarkId = req.query.id

  if (!bookmarkId) {
    return res.status(400).json({ error: 'Missing bookmark id' })
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  const upstream = await fetch(`${apiBaseUrl}/auth/v1/bookmarks/${bookmarkId}`, {
    method: 'DELETE',
    headers: {
      'x-auth-token': req.headers['x-auth-token'] ?? '',
      'x-client-id':  req.headers['x-client-id']  ?? clientId,
    },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!upstream) return res.status(502).json({ error: 'Upstream request failed' })
  if (upstream.status === 204) return res.status(204).end()

  const data = await upstream.json().catch(() => null)
  return res.status(upstream.status).json(data)
}
