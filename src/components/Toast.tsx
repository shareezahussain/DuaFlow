import { useEffect, useState } from 'react'
import { _setToastListener } from '../util/toast'

export default function Toast() {
  const [msg, setMsg]         = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    _setToastListener(setMsg)
    return () => _setToastListener(null)
  }, [])

  useEffect(() => {
    if (!msg) return
    // Tick after mount so the opacity transition fires
    const show = requestAnimationFrame(() => setVisible(true))
    const hide = setTimeout(() => setVisible(false), 2200)
    const clear = setTimeout(() => setMsg(null), 2400)
    return () => {
      cancelAnimationFrame(show)
      clearTimeout(hide)
      clearTimeout(clear)
    }
  }, [msg])

  if (!msg) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl pointer-events-none transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {msg}
    </div>
  )
}
