/**
 * Vercel serverless function — proxies the OIDC userinfo endpoint to avoid CORS.
 * GET /api/userinfo
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers['authorization']
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' })

  const { authBaseUrl } = getQfOAuthConfig()

  const upstream = await fetch(`${authBaseUrl}/oauth2/userinfo`, {
    headers: { Authorization: auth },
    signal:  AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!upstream) return res.status(502).json({ error: 'Upstream request failed' })

  const data = await upstream.json().catch(() => null)
  return res.status(upstream.status).json(data)
}
