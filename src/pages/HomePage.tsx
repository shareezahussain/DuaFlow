import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import type { Dua } from '../data/rabbanas'
import Footer from '../components/Footer'

const LANG_LABELS = { en: 'English', ur: 'اردو', bn: 'বাংলা' } as const

export default function HomePage() {
  const navigate = useNavigate()
  const { language, setLanguage, addToPrint, removeFromPrint, isInPrint, printCollection } = useApp()
  const { duas, isLoading, error, retry } = useQuranContent()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 9

  const filtered = duas.filter((d: Dua) =>
    d.arabicText.includes(search) ||
    d.transliteration.toLowerCase().includes(search.toLowerCase()) ||
    d.translations.en.toLowerCase().includes(search.toLowerCase()) ||
    d.topic.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const DuaCard = useCallback(({ dua }: { dua: Dua }) => {
    const inPrint = isInPrint(dua.id)
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="flex-1 text-sm font-semibold text-[#1a5276] truncate">{dua.topic}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {dua.surah}:{dua.ayah}
          </span>
        </div>

        {/* Arabic */}
        <p className="arabic text-xl text-right text-[#1a1a2e] leading-loose mb-1 line-clamp-2">
          {dua.arabicText}
        </p>

        {/* Transliteration */}
        <p className="text-xs text-gray-500 italic mb-2 truncate">{dua.transliteration}</p>

        {/* Translation */}
        <p className="text-sm text-gray-700 leading-relaxed mb-3 line-clamp-2">
          {dua.translations[language]}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => inPrint ? removeFromPrint(dua.id) : addToPrint(dua)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              inPrint
                ? 'bg-[#1a5276] text-white border-[#1a5276]'
                : 'text-[#1a5276] border-[#1a5276] hover:bg-[#1a5276] hover:text-white'
            }`}
          >
            {inPrint ? '✓ In Print' : '+ Add to Print'}
          </button>
          <Link
            to={`/dua/${dua.id}`}
            className="flex-1 py-2 rounded-lg text-xs font-bold text-center bg-[#f39c12] text-white hover:bg-[#e67e22] transition-colors"
          >
            ▶ Listen
          </Link>
        </div>
      </div>
    )
  }, [language, isInPrint, addToPrint, removeFromPrint])

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* Header */}
      <header className="bg-[#1a5276] sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-wide">DuaFlow</h1>
            <p className="text-[#a9cce3] text-xs mt-0.5">Quranic Supplications</p>
          </div>
          <button
            onClick={() => navigate('/print')}
            className="bg-[#2e86c1] hover:bg-[#1a5276] text-white font-bold text-sm px-4 py-2 rounded-full transition-colors"
          >
            🖨 {printCollection.length}
          </button>
        </div>

        {/* Language toggle */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          {(['en', 'ur', 'bn'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                language === lang
                  ? 'bg-[#f39c12] border-[#f39c12] text-white font-bold'
                  : 'border-[#2e86c1] text-[#a9cce3] hover:border-white hover:text-white'
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-5">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by topic, dua, or translation…"
            className="w-full bg-white rounded-xl px-4 py-3 pr-10 shadow-sm text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a5276]"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-[#1a5276] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading duas from Quran Foundation…</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <p className="text-gray-500">Failed to load duas</p>
            <button
              onClick={retry}
              className="px-6 py-2 bg-[#1a5276] text-white rounded-full text-sm font-semibold hover:bg-[#2e86c1]"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-16">No duas found</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginated.map(dua => <DuaCard key={dua.id} dua={dua} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <button
                      onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl border border-[#1a5276] text-[#1a5276] text-sm font-semibold disabled:opacity-30 hover:bg-[#1a5276] hover:text-white transition-colors"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => { setPage(p); window.scrollTo(0, 0) }}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                          p === page
                            ? 'bg-[#1a5276] text-white'
                            : 'border border-gray-200 text-gray-500 hover:border-[#1a5276] hover:text-[#1a5276]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-xl border border-[#1a5276] text-[#1a5276] text-sm font-semibold disabled:opacity-30 hover:bg-[#1a5276] hover:text-white transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Print FAB */}
      {printCollection.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <button
            onClick={() => navigate('/print')}
            className="bg-[#1a5276] hover:bg-[#2e86c1] text-white font-bold px-8 py-4 rounded-full shadow-2xl text-sm transition-colors whitespace-nowrap"
          >
            🖨 Design &amp; Print ({printCollection.length})
          </button>
        </div>
      )}
    </div>
  )
}
