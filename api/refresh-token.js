/**
 * Vercel serverless function — refreshes an access token server-side.
 * Confidential client: client_secret stays on the server, never sent to browser.
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
    return res.status(500).json({ error: 'Client secret is required for confidential client token refresh' })
  }

  const { refresh_token } = req.body ?? {}
  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing required field: refresh_token' })
  }

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token,
  }).toString()

  try {
    const response = await fetch(`${authBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization:  `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to refresh access token' })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to refresh access token' })
  }
}
