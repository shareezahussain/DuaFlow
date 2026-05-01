/**
 * Vercel serverless function — exchanges an authorization code for tokens.
 * POST /api/user-token
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientId, clientSecret, authBaseUrl } = getQfOAuthConfig()

  if (!clientSecret) return res.status(500).json({ error: 'Client secret not configured' })

  const { code, code_verifier } = req.body ?? {}
  if (!code || !code_verifier) return res.status(400).json({ error: 'Missing required fields: code, code_verifier' })

  const body = typeof req.body === 'object'
    ? new URLSearchParams(req.body).toString()
    : req.body

  const upstream = await fetch(`${authBaseUrl}/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!upstream) return res.status(502).json({ error: 'Upstream request failed' })
  if (!upstream.ok) return res.status(upstream.status).json({ error: 'Failed to exchange authorization code' })

  const data = await upstream.json().catch(() => null)
  return res.status(200).json(data)
}
