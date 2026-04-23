/**
 * Vercel serverless function — proxies the OIDC userinfo endpoint server-side
 * to avoid CORS. Forwards the Authorization header from the browser.
 */
import { getQfOAuthConfig } from './config/qfOAuthConfig.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }

  let authBaseUrl
  try {
    ;({ authBaseUrl } = getQfOAuthConfig())
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  try {
    const response = await fetch(`${authBaseUrl}/oauth2/userinfo`, {
      headers: { Authorization: authHeader },
    })
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch userinfo' })
  }
}
