/**
 * Vercel serverless function — proxies OAuth token requests to the Quran Foundation
 * auth server server-side to avoid CORS issues.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const OAUTH_URL = 'https://oauth2.quran.foundation/oauth2/token'

  // Vercel may auto-parse the body into an object — convert back to URL-encoded string
  let body = req.body
  if (body && typeof body === 'object') {
    body = new URLSearchParams(body).toString()
  }

  const response = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: req.headers['authorization'],
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()
  return res.status(response.status).json(data)
}
