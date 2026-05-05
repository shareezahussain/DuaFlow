/**
 * Vercel serverless function — proxies content API token requests (client_credentials).
 * POST /api/token
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, clientSecret, authBaseUrl } = getQfOAuthConfig()

  const auth = req.headers['authorization']
    ?? `Basic ${Buffer.from(`${clientId}:${clientSecret ?? ''}`).toString('base64')}`

  const body = req.body && typeof req.body === 'object'
    ? new URLSearchParams(req.body).toString()
    : req.body

  const upstream = await fetch(`${authBaseUrl}/oauth2/token`, {
    method:  'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal:  AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!upstream) return res.status(502).json({ error: 'Upstream request failed' })

  const data = await upstream.json().catch(() => null)
  return res.status(upstream.status).json(data)
}
