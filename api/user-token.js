/**
 * Vercel serverless function — exchanges an authorization code for tokens
 * using the prelive confidential client (secret stays server-side).
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let clientId, clientSecret, authBaseUrl
  try {
    ;({ clientId, clientSecret, authBaseUrl } = getQfOAuthConfig())
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  if (!clientSecret) {
    return res.status(500).json({ error: 'Client secret is required for confidential client token exchange' })
  }

  const { code, code_verifier } = req.body ?? {}
  if (!code || !code_verifier) {
    return res.status(400).json({ error: 'Missing required fields: code, code_verifier' })
  }

  const tokenUrl    = `${authBaseUrl}/oauth2/token`
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  let body = req.body
  if (body && typeof body === 'object') {
    body = new URLSearchParams(body).toString()
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to exchange authorization code for tokens' })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to exchange authorization code for tokens' })
  }
}
