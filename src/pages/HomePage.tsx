import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import type { Dua, DuaCategory } from '../data/rabbanas'
import Footer from '../components/Footer'
import SignInModal from '../components/SignInModal'
import BookmarksPanel from '../components/BookmarksPanel'
import PrintCartPanel from '../components/PrintCartPanel'
import DuaPreviewModal from '../components/DuaPreviewModal'
import DuaCard from '../components/DuaCard'
import { sanitizeSearchInput, sanitizeDuaFields } from '../util/searchUtils'

import { LANG_LABELS } from '../util/constants'

const PAGE_SIZE = 9

const FILTERS: Array<{
  key:   DuaCategory
  label: string
  idle:  string  // unselected classes
  active: string // selected classes
}> = [
  { key: 'peace',      label: '🕊️ Peace',       idle: 'border-sky-300 text-sky-700 bg-sky-50',         active: 'bg-sky-500 border-sky-500 text-white' },
  { key: 'forgiveness',label: '🌿 Forgiveness',  idle: 'border-emerald-300 text-emerald-700 bg-emerald-50', active: 'bg-emerald-600 border-emerald-600 text-white' },
  { key: 'healing',    label: '💜 Healing',      idle: 'border-violet-300 text-violet-700 bg-violet-50', active: 'bg-violet-600 border-violet-600 text-white' },
  { key: 'provision',  label: '✨ Provision',    idle: 'border-amber-300 text-amber-700 bg-amber-50',    active: 'bg-amber-500 border-amber-500 text-white' },
  { key: 'repentance', label: '🤲 Repentance',   idle: 'border-rose-300 text-rose-700 bg-rose-50',      active: 'bg-rose-600 border-rose-600 text-white' },
]

export default function HomePage() {
  const {
    language,
    setLanguage,
    printCollection,
    bookmarkMap,
    userToken,
    userName,
    userPicture,
    signOut,
    fetchAndSetUserName,
  } = useApp()

  useEffect(() => {
    if (userToken && !userName) fetchAndSetUserName()
  }, [userToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const { duas, isLoading, error, retry } = useQuranContent()

  const [search,           setSearch]           = useState('')
  const [activeFilters,    setActiveFilters]    = useState<Set<DuaCategory>>(new Set())
  const [showFilters,      setShowFilters]      = useState(false)
  const [page,             setPage]             = useState(1)
  const [showSignIn,    setShowSignIn]    = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showPrintCart, setShowPrintCart] = useState(false)
  const [showUserMenu,  setShowUserMenu]  = useState(false)
  const [previewDua,    setPreviewDua]    = useState<Dua | null>(null)

  const bookmarkCount = Object.keys(bookmarkMap).length

  const toggleFilter = useCallback((key: DuaCategory) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setPage(1)
  }, [])

  const filtered = useMemo(() => {
    const term = sanitizeSearchInput(search)
    return duas.filter((d: Dua) => {
      if (activeFilters.size > 0 && !(d.categories ?? []).some(c => activeFilters.has(c))) return false
      if (!term) return true
      const { topic, translation, transliteration, arabic } = sanitizeDuaFields(d)
      return arabic.includes(term) || transliteration.includes(term) || translation.includes(term) || topic.includes(term)
    })
  }, [duas, search, activeFilters])

  const totalPages = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered.length])

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const handleSignIn = useCallback(() => setShowSignIn(true), [])

  const handlePreview = useCallback((dua: Dua) => () => setPreviewDua(dua), [])

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-green sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex max-[420px]:flex-col items-center max-[420px]:items-start justify-between max-[420px]:justify-start gap-0 max-[420px]:gap-[1rem]">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-wide"><a href="/">Tadafuq Al-Du'aa</a></h1>
            <p className="text-white/75 text-xs mt-0.5">Quranic Supplications</p>
          </div>

          <div className="flex items-center gap-2 max-[420px]:flex-row-reverse">
            <button
              onClick={() => setShowPrintCart(true)}
              aria-label={`Print collection, ${printCollection.length} item${printCollection.length !== 1 ? 's' : ''}`}
              className="bg-white hover:bg-gray-100 text-gold-dark font-bold text-xs w-[60px] h-[34px] rounded-full transition-colors flex items-center justify-center gap-1"
            >
              🖨 {printCollection.length}
            </button>

            {userToken ? (
              <>
                <button
                  onClick={() => setShowBookmarks(true)}
                  aria-label={`Saved duas, ${bookmarkCount} saved`}
                  className="bg-white hover:bg-gray-100 text-gold-dark font-bold text-xs w-[60px] h-[34px] rounded-full transition-colors flex items-center justify-center gap-1"
                >
                  🔖 {bookmarkCount}
                </button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-green-light hover:border-white hover:bg-green-light transition-colors"
                  >
                    {userPicture && (
                      <img src={userPicture} alt="" className="w-5 h-5 rounded-full object-cover" />
                    )}
                    Hello, {userName?.split(' ')[0] ?? 'there'} 👋
                  </button>

                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[180px] z-20 max-[420px]:left-[0.5rem]">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs font-semibold text-green truncate">{userName ?? 'Signed in'}</p>
                        </div>
                        <button
                          onClick={() => { setShowBookmarks(true); setShowUserMenu(false) }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          🔖 My Bookmarks <span className="ml-auto text-xs text-gray-400">{bookmarkCount}</span>
                        </button>
                        <a
                          href="https://quran.com/profile"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShowUserMenu(false)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          👤 Manage Profile
                        </a>
                        <div className="border-t border-gray-100 mt-1" />
                        <button
                          onClick={() => { signOut(); setShowUserMenu(false) }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                        >
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowSignIn(true)}
                className="bg-white hover:bg-gray-100 text-gold-dark font-bold text-xs px-3 py-1.5 rounded-full transition-colors"
              >
                🔖 Sign in
              </button>
            )}
          </div>
        </div>

        {/* Language toggle */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          {(['en', 'ur', 'bn'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                language === lang
                  ? 'bg-white border-white text-gold-dark font-bold'
                  : 'border-white/30 text-white/70 hover:border-white hover:text-white'
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Search bar + filter button */}
        <div className="flex gap-2 mb-5">
          {/* Search — takes remaining width */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by topic, dua, or translation…"
              className="w-full bg-white rounded-xl px-4 py-3 pr-10 shadow-sm text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green"
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

          {/* Filter button + dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`h-full px-4 rounded-xl shadow-sm border text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                activeFilters.size > 0
                  ? 'bg-green border-green text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-green'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
              </svg>
              Filter
              {activeFilters.size > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold flex items-center justify-center">
                  {activeFilters.size}
                </span>
              )}
            </button>

            {showFilters && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Filter by theme</p>
                  <div className="flex flex-wrap gap-2">
                    {FILTERS.map(({ key, label, idle, active }) => (
                      <button
                        key={key}
                        onClick={() => toggleFilter(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          activeFilters.has(key) ? active : idle
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {activeFilters.size > 0 && (
                    <button
                      onClick={() => { setActiveFilters(new Set()); setPage(1) }}
                      className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Skeleton cards — shown only on first load (no cache) */}
        {isLoading && duas.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 bg-gray-200 rounded flex-1" />
                  <div className="w-16 h-4 bg-gray-100 rounded-full" />
                </div>
                <div className="h-12 bg-gray-100 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-8 bg-gray-100 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-100 rounded flex-1" />
                  <div className="h-8 bg-gold/20 rounded flex-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <p className="text-gray-500">Failed to load duas</p>
            <button
              onClick={retry}
              className="px-6 py-2 bg-green text-white rounded-full text-sm font-semibold hover:bg-green-light"
            >
              Retry
            </button>
          </div>
        )}

        {/* Grid */}
        {!error && duas.length > 0 && (
          <>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-16">No duas found</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginated.map(dua => (
                    <DuaCard
                      key={dua.id}
                      dua={dua}
                      onSignIn={handleSignIn}
                      onPreview={handlePreview(dua)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <button
                      onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl border border-green text-green text-sm font-semibold disabled:opacity-30 hover:bg-green hover:text-white transition-colors"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => { setPage(p); window.scrollTo(0, 0) }}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                          p === page
                            ? 'bg-green text-white'
                            : 'border border-gray-200 text-gray-500 hover:border-green hover:text-green'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-xl border border-green text-green text-sm font-semibold disabled:opacity-30 hover:bg-green hover:text-white transition-colors"
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

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      {showBookmarks && <BookmarksPanel onClose={() => setShowBookmarks(false)} />}
      {showPrintCart && <PrintCartPanel onClose={() => setShowPrintCart(false)} />}
      {previewDua && (
        <DuaPreviewModal
          dua={previewDua}
          onClose={() => setPreviewDua(null)}
          onSignIn={() => { setPreviewDua(null); setShowSignIn(true) }}
        />
      )}

      {/* Print FAB */}
      {printCollection.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <Link
            to="/print"
            className="bg-green hover:bg-green-light text-white font-bold px-8 py-4 rounded-full shadow-2xl text-sm transition-colors whitespace-nowrap"
          >
            🖨 Design &amp; Print ({printCollection.length})
          </Link>
        </div>
      )}
    </div>
  )
}
