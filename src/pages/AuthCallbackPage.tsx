import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCodeForToken } from '../services/bookmarksApi'
import { useApp } from '../context/AppContext'

export default function AuthCallbackPage() {
  const navigate  = useNavigate()
  const { applyAuthTokens } = useApp()
  const [error, setError] = useState<string | null>(null)
  const exchanged = useRef(false)

  function fail(msg: string) {
    if (window.opener) {
      window.opener.postMessage({ type: 'qf-auth-callback', error: msg }, window.location.origin)
      window.close()
    } else {
      setError(msg)
    }
  }

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const state  = params.get('state')
    const err    = params.get('error')

    if (err)                                        return fail(`Authorization denied: ${params.get('error_description') ?? err}`)
    if (state !== localStorage.getItem('pkce_state')) return fail('State validation failed - please try signing in again')
    if (!code)                                       return fail('No authorization code received.')

    exchangeCodeForToken(code)
      .then(async ({ access_token, refresh_token, id_token }) => {
        if (window.opener) {
          window.opener.postMessage(
            { type: 'qf-auth-callback', access_token, refresh_token, id_token },
            window.location.origin
          )
          window.close()
          return
        }

        // Redirect flow — applyAuthTokens handles tokens, name, bookmarks
        await applyAuthTokens({ access_token, refresh_token, id_token })
        navigate('/', { replace: true })
      })
      .catch((e: Error) => fail(e.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600 text-sm text-center max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-navy text-white rounded-full text-sm font-semibold hover:bg-navy-light"
        >
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Signing you in…</p>
    </div>
  )
}
