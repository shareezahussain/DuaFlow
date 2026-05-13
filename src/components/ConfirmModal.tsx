import { useEffect, useRef } from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'confirmSlideUp 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #1a5276, #1e8449)' }} />

        <div className="p-6">
          <h2 className="text-green font-extrabold text-base mb-1">{title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors bg-green-dark hover:bg-green"
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}
