/**
 * Vercel serverless function — proxies OAuth token requests to the Quran Foundation
 * auth server. This avoids CORS issues since the request is made server-side.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const OAUTH_URL = 'https://oauth2.quran.foundation/oauth2/token'

  const response = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: req.headers['authorization'],
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: req.body,
  })

  const data = await response.json()
  return res.status(response.status).json(data)
}
