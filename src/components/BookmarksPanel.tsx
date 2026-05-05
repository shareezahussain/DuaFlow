import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import { useBookmarkToggle } from '../hooks/useBookmarkToggle'
import type { Dua } from '../data/rabbanas'

interface Props {
  onClose: () => void
}

// Each row owns its own hook instance — same optimistic update, rollback, and
// toast behaviour as DuaCard, DuaPreviewModal, and DuaDetailPage.
function BookmarkRow({ dua }: { dua: Dua }) {
  const { isLoading, toggle } = useBookmarkToggle(dua, () => {})

  return (
    <li className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-green truncate">{dua.topic}</p>
        <p className="text-xs text-gray-400 mb-1">{dua.surah}:{dua.ayah}</p>
        <p className="arabic text-sm text-right text-green-dark leading-loose line-clamp-2">
          {dua.arabicText}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={isLoading}
        aria-label="Remove bookmark"
        className="shrink-0 mt-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        {isLoading
          ? <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          : '🗑'}
      </button>
    </li>
  )
}

export default function BookmarksPanel({ onClose }: Props) {
  const { bookmarkMap } = useApp()
  const { duas } = useQuranContent()

  const items = duas.filter(d => `${d.surah}:${d.ayah}` in bookmarkMap)

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="font-bold text-green text-sm">Saved Duas ({items.length})</span>
          <button
            onClick={onClose}
            aria-label="Close saved duas"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Nothing saved yet</p>
          ) : (
            <ul className="space-y-2">
              {items.map(dua => <BookmarkRow key={dua.id} dua={dua} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
