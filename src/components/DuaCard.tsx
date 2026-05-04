import { Link } from 'react-router-dom'
import type { Dua } from '../data/rabbanas'
import { useApp } from '../context/AppContext'
import { useBookmarkToggle } from '../hooks/useBookmarkToggle'
import { toast } from '../util/toast'

interface DuaCardProps {
  dua: Dua
  onSignIn: () => void
  onPreview: () => void
}

export default function DuaCard({ dua, onSignIn, onPreview }: DuaCardProps) {
  const { language, addToPrint, removeFromPrint, isInPrint } = useApp()
  const { isBookmarked: bm, isLoading: bmLoading, showSparkle, toggle: toggleBookmark } = useBookmarkToggle(dua, onSignIn)

  const inPrint = isInPrint(dua.id)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View full dua: ${dua.topic}, Surah ${dua.surah}:${dua.ayah}`}
      className="relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-green"
      onClick={onPreview}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPreview() } }}
    >
      <img
        src="/dua-card-bg.svg"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-contain opacity-[0.04]"
      />

      <div className="flex items-center gap-2 mb-3">
        <span className="flex-1 text-sm font-semibold text-green truncate">{dua.topic}</span>

        <div className="relative group" onClick={e => e.stopPropagation()}>
          {showSparkle && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0">
              {[0,1,2,3,4].map(i => (
                <span
                  key={i}
                  className="sparkle-dot absolute w-1 h-1 rounded-full bg-gold"
                  style={{ top: '50%', left: '50%', '--angle': `${i * 72}deg`, animationDelay: `${i * 0.05}s` } as React.CSSProperties}
                />
              ))}
            </span>
          )}
          <button
            onClick={toggleBookmark}
            disabled={bmLoading}
            aria-label={bm ? 'Remove bookmark' : 'Save bookmark'}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
              bm ? 'bg-gold/20 ring-1 ring-gold' : 'hover:bg-gray-100'
            }`}
          >
            {bmLoading
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              : bm ? '🔖' : '🏷'}
          </button>
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-[-0.5rem] px-2 py-0.5 text-xs bg-gray-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {bm ? 'Remove' : 'Save'}
          </span>
        </div>

        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {dua.surah}:{dua.ayah}
        </span>
      </div>

      <div className="relative mb-1">
        <p className="arabic text-xl text-right text-green-dark leading-loose line-clamp-2">
          {dua.arabicText}
        </p>
        <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent pointer-events-none" aria-hidden="true" />
      </div>

      <p className="text-xs text-gray-500 italic mb-2 truncate">{dua.transliteration}</p>

      <div className="relative mb-1">
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
          {dua.translations[language] ?? dua.translations.en}
        </p>
        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none" aria-hidden="true" />
      </div>
      <p className="text-[11px] text-green/60 mb-3 text-right">View full dua →</p>

      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => { if (inPrint) { removeFromPrint(dua.id) } else { addToPrint(dua); toast('Added to print collection ✓') } }}
          aria-label={inPrint ? 'Remove from print collection' : 'Add to print collection'}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            inPrint
              ? 'bg-green text-white border-green'
              : 'text-green border-green hover:bg-green hover:text-white'
          }`}
        >
          {inPrint ? '✓ In Print' : '+ Add to Print'}
        </button>
        <Link
          to={`/dua/${dua.id}`}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-center bg-gold text-white hover:bg-gold-dark transition-colors"
        >
          ▶ Listen
        </Link>
      </div>
    </div>
  )
}
