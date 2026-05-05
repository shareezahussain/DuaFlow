/**
 * Vercel serverless function — refreshes an access token server-side.
 * POST /api/refresh-token
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, clientSecret, authBaseUrl } = getQfOAuthConfig()

  if (!clientSecret) return res.status(500).json({ error: 'Client secret not configured' })

  const { refresh_token } = req.body ?? {}
  if (!refresh_token) return res.status(400).json({ error: 'Missing required field: refresh_token' })

  const upstream = await fetch(`${authBaseUrl}/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:   new URLSearchParams({ grant_type: 'refresh_token', refresh_token }).toString(),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!upstream) return res.status(502).json({ error: 'Upstream request failed' })
  if (!upstream.ok) return res.status(upstream.status).json({ error: 'Failed to refresh access token' })

  const data = await upstream.json().catch(() => null)
  return res.status(200).json(data)
}
