import { useState } from 'react'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

export default function SignInModal({ onClose }: Props) {
  const { startLogin } = useApp()
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  async function handleSignIn() {
    setLoading(true)
    setErr('')
    try {
      await startLogin()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to sign in'
      if (msg !== 'Sign-in cancelled') setErr(msg)
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-green font-bold text-lg mb-2">Sign in to bookmark duas</h2>
        <p className="text-gray-500 text-xs mb-5">
          Bookmarks sync to your Quran Foundation account. A sign-in window will open — complete it to continue.
        </p>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full py-3 bg-green hover:bg-green-light text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Waiting for sign-in…</>
            : 'Sign in with Quran Foundation'}
        </button>

        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-gray-400 text-xs hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
