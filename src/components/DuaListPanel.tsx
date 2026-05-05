import { useState } from 'react'

export interface DuaListItem {
  id: number
  topic: string
  surah: number
  ayah: number
  arabicText: string
}

interface Props {
  title: string
  items: DuaListItem[]
  onRemove: (id: number) => void | Promise<void>
  onClose: () => void
  footer?: React.ReactNode
}

export default function DuaListPanel({ title, items, onRemove, onClose, footer }: Props) {
  const [removing, setRemoving] = useState<number | null>(null)

  async function handleRemove(id: number) {
    setRemoving(id)
    try {
      await onRemove(id)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 px-4 pt-16"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="font-bold text-green text-sm">{title} ({items.length})</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Nothing here yet</p>
          ) : (
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green truncate">{item.topic}</p>
                    <p className="text-xs text-gray-400 mb-1">{item.surah}:{item.ayah}</p>
                    <p className="arabic text-sm text-right text-green-dark leading-loose line-clamp-2">
                      {item.arabicText}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={removing === item.id}
                    className="shrink-0 mt-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Remove"
                  >
                    {removing === item.id
                      ? <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      : '🗑'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Optional footer */}
        {footer && (
          <div className="px-3 py-3 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
