import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import type { Dua } from '../data/rabbanas'
import { addBookmark, removeBookmark } from '../services/bookmarksApi'
import Footer from '../components/Footer'
import SignInModal from '../components/SignInModal'
import BookmarksPanel from '../components/BookmarksPanel'
import PrintCartPanel from '../components/PrintCartPanel'
import DuaPreviewModal from '../components/DuaPreviewModal'
import {sanitizeSearchInput, sanitizeDuaFields} from '../util/searchUtils'

const LANG_LABELS = { en: 'English', ur: 'اردو', bn: 'বাংলা' } as const

// ── DuaCard ───────────────────────────────────────────────────────────────────

function DuaCard({ dua, onSignIn, onPreview }: { dua: Dua; onSignIn: () => void; onPreview: () => void }) {
  const { language, addToPrint, removeFromPrint, isInPrint,
          isBookmarked, bookmarkMap, setBookmarkMap, userToken } = useApp()
  const inPrint = isInPrint(dua.id)
  const bm = isBookmarked(dua.id)
  const [bmLoading, setBmLoading] = useState(false)

  async function toggleBookmark() {
    if (!userToken || bmLoading) return
    if (!userToken) { onSignIn(); return }
    setBmLoading(true)
    try {
      const key = String(dua.id)
      if (bm) {
        const bmId = bookmarkMap[key]
        if (!bmId) {
          const updated = { ...bookmarkMap }
          delete updated[key]
          setBookmarkMap(updated)
          return
        }
        await removeBookmark(userToken, bmId)
        const updated = { ...bookmarkMap }
        delete updated[key]
        setBookmarkMap(updated)
      } else {
        const created = await addBookmark(userToken, dua.surah, dua.ayah)
        const bmId = created.id
        if (bmId) setBookmarkMap({ ...bookmarkMap, [key]: bmId })
      }
    } finally {
      setBmLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onPreview}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-1 text-sm font-semibold text-navy truncate">{dua.topic}</span>
        <div className="relative group" onClick={e => e.stopPropagation()}>
          <button
            onClick={toggleBookmark}
            disabled={bmLoading}
            className={`text-base rounded-full px-1.5 py-0.5 transition-colors disabled:opacity-40 ${
              bm ? 'bg-gold/20 ring-1 ring-gold' : 'opacity-30 hover:opacity-60'
            }`}
          >
            {bmLoading
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              : bm ? '🔖' : '🏷'}
          </button>
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-xs bg-gray-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {bm ? 'Remove' : 'Save'}
          </span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {dua.surah}:{dua.ayah}
        </span>
      </div>

      {/* Arabic */}
      <p className="arabic text-xl text-right text-navy-dark leading-loose mb-1 line-clamp-2">
        {dua.arabicText}
      </p>

      {/* Transliteration */}
      <p className="text-xs text-gray-500 italic mb-2 truncate">{dua.transliteration}</p>

      {/* Translation */}
      <p className="text-sm text-gray-700 leading-relaxed mb-3 line-clamp-2">
        {dua.translations[language]}
      </p>

      {/* Actions */}
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => inPrint ? removeFromPrint(dua.id) : addToPrint(dua)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            inPrint
              ? 'bg-navy text-white border-navy'
              : 'text-navy border-navy hover:bg-navy hover:text-white'
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

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { language, setLanguage, printCollection, bookmarkMap, userToken, userName, userPicture, signOut, fetchAndSetUserName } = useApp()

  useEffect(() => {
    if (userToken && !userName) fetchAndSetUserName()
  }, [userToken]) // eslint-disable-line react-hooks/exhaustive-deps
  const { duas, isLoading, error, retry } = useQuranContent()
  const [search,         setSearch]        = useState('')
  const [page,           setPage]          = useState(1)
  const [showSignIn,     setShowSignIn]     = useState(false)
  const [showBookmarks,  setShowBookmarks]  = useState(false)
  const [showPrintCart,  setShowPrintCart]  = useState(false)
  const [showUserMenu,   setShowUserMenu]   = useState(false)
  const [previewDua,     setPreviewDua]     = useState<Dua | null>(null)
  const bookmarkCount = Object.keys(bookmarkMap).length
  const PAGE_SIZE = 9

const searchTerm = sanitizeSearchInput(search);

const filtered = duas.filter((d: Dua) => {
  const { topic, translation, transliteration, arabic } = sanitizeDuaFields(d);

  return (
    arabic.includes(searchTerm) ||
    transliteration.includes(searchTerm) ||
    translation.includes(searchTerm) ||
    topic.includes(searchTerm)
  );
});

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-navy sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex max-[420px]:flex-col items-center max-[420px]:items-start justify-between max-[420px]:justify-start gap-0 max-[420px]:gap-[1rem]">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-wide"><a href="/">DuaFlow</a></h1>
            <p className="text-navy-muted text-xs mt-0.5">Quranic Supplications</p>
          </div>
          <div className="flex items-center gap-2 max-[420px]:flex-row-reverse">
            <button
              onClick={() => setShowPrintCart(true)}
              className="bg-navy-light hover:bg-navy text-white font-bold text-sm px-4 py-2 rounded-full transition-colors"
            >
              🖨 {printCollection.length}
            </button>
            {userToken ? (
              <>
                <button
                  onClick={() => setShowBookmarks(true)}
                  className="bg-gold hover:bg-gold-dark text-white font-bold text-xs px-3 py-1.5 rounded-full transition-colors"
                >
                  🔖 {bookmarkCount}
                </button>
                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-navy-light hover:border-white hover:bg-navy-light transition-colors"
                  >
                    {userPicture && <img src={userPicture} alt="" className="w-5 h-5 rounded-full object-cover" />}
                    Hello, {userName?.split(' ')[0] ?? 'there'} 👋
                  </button>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[180px] z-20">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs font-semibold text-navy truncate">{userName ?? 'Signed in'}</p>
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
                className="bg-gold hover:bg-gold-dark text-white font-bold text-xs px-3 py-1.5 rounded-full transition-colors"
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
                  ? 'bg-gold border-gold text-white font-bold'
                  : 'border-navy-light text-navy-muted hover:border-white hover:text-white'
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
            className="w-full bg-white rounded-xl px-4 py-3 pr-10 shadow-sm text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy"
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
            <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading duas from Quran Foundation…</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <p className="text-gray-500">Failed to load duas</p>
            <button
              onClick={retry}
              className="px-6 py-2 bg-navy text-white rounded-full text-sm font-semibold hover:bg-navy-light"
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
                  {paginated.map(dua => (
                    <DuaCard key={dua.id} dua={dua} onSignIn={() => setShowSignIn(true)} onPreview={() => setPreviewDua(dua)} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <button
                      onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl border border-navy text-navy text-sm font-semibold disabled:opacity-30 hover:bg-navy hover:text-white transition-colors"
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => { setPage(p); window.scrollTo(0, 0) }}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                          p === page
                            ? 'bg-navy text-white'
                            : 'border border-gray-200 text-gray-500 hover:border-navy hover:text-navy'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-xl border border-navy text-navy text-sm font-semibold disabled:opacity-30 hover:bg-navy hover:text-white transition-colors"
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
      {previewDua && <DuaPreviewModal dua={previewDua} onClose={() => setPreviewDua(null)} onSignIn={() => { setPreviewDua(null); setShowSignIn(true) }} />}

      {/* Print FAB */}
      {printCollection.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <Link
            to="/print"
            className="bg-navy hover:bg-navy-light text-white font-bold px-8 py-4 rounded-full shadow-2xl text-sm transition-colors whitespace-nowrap"
          >
            🖨 Design &amp; Print ({printCollection.length})
          </Link>
        </div>
      )}
    </div>
  )
}
