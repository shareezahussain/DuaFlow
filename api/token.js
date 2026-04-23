/**
 * Vercel serverless function — proxies content API OAuth token requests
 * (client_credentials, scope=content) server-side to avoid CORS.
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { clientId, clientSecret, authBaseUrl } = getQfOAuthConfig()
  const tokenUrl = `${authBaseUrl}/oauth2/token`

  let body = req.body
  if (body && typeof body === 'object') {
    body = new URLSearchParams(body).toString()
  }

  // Use Authorization header from browser if provided, otherwise use server credentials
  const authHeader = req.headers['authorization']
    ?? `Basic ${Buffer.from(`${clientId}:${clientSecret ?? ''}`).toString('base64')}`

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization:  authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()
  return res.status(response.status).json(data)
}
