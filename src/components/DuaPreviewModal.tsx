import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Dua } from '../data/rabbanas'
import { useApp } from '../context/AppContext'
import { addBookmark, removeBookmark } from '../services/bookmarksApi'

type Lang = 'en' | 'ur' | 'bn'
const LANG_LABELS: Record<Lang, string> = { en: 'English', ur: 'اردو', bn: 'বাংলা' }

interface Props {
  dua: Dua
  onClose: () => void
  onSignIn: () => void
}

export default function DuaPreviewModal({ dua, onClose, onSignIn }: Props) {
  const { language, addToPrint, removeFromPrint, isInPrint,
          isBookmarked, bookmarkMap, setBookmarkMap, userToken } = useApp()
  const [lang, setLang] = useState<Lang>(language)
  const [bmLoading, setBmLoading] = useState(false)
  const inPrint = isInPrint(dua.id)
  const bm = isBookmarked(dua.id)

  async function toggleBookmark() {
    if (!userToken) { onSignIn(); return }
    if (bmLoading) return
    setBmLoading(true)
    try {
      const key = String(dua.id)
      if (bm) {
        const bmId = bookmarkMap[key]
        if (bmId) await removeBookmark(userToken, bmId)
        const updated = { ...bookmarkMap }
        delete updated[key]
        setBookmarkMap(updated)
      } else {
        const created = await addBookmark(userToken, dua.surah, dua.ayah)
        if (created.id) setBookmarkMap({ ...bookmarkMap, [key]: created.id })
      }
    } finally {
      setBmLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy text-base truncate">{dua.topic}</p>
            <p className="text-xs text-gray-400 mt-0.5">Surah {dua.surah}:{dua.ayah}</p>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button
              onClick={toggleBookmark}
              disabled={bmLoading}
              className={`text-sm px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 flex items-center gap-1 ${
                bm ? 'bg-gold/20 border-gold text-gold' : 'border-gray-200 text-gray-400 hover:border-gold hover:text-gold'
              }`}
            >
              {bmLoading
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                : bm ? '🔖' : '🏷'}
              <span className="text-xs font-medium">{bm ? 'Saved' : 'Save'}</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          {/* Arabic */}
          <p dir="rtl" className="arabic text-2xl text-right text-navy-dark leading-loose">
            {dua.arabicText}
          </p>

          {/* Transliteration */}
          <p className="text-sm text-gray-500 italic leading-relaxed">
            {dua.transliteration}
          </p>

          {/* Language toggle */}
          <div className="flex gap-1.5">
            {(['en', 'ur', 'bn'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  lang === l
                    ? 'bg-navy border-navy text-white'
                    : 'border-gray-200 text-gray-500 hover:border-navy'
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          {/* Translation */}
          <p className="text-sm text-gray-700 leading-relaxed pb-1">
            {dua.translations[lang]}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => { inPrint ? removeFromPrint(dua.id) : addToPrint(dua) }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
              inPrint
                ? 'bg-navy text-white border-navy'
                : 'text-navy border-navy hover:bg-navy hover:text-white'
            }`}
          >
            {inPrint ? '✓ In Print' : '+ Add to Print'}
          </button>
          <Link
            to={`/dua/${dua.id}`}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center bg-gold hover:bg-gold-dark text-white transition-colors"
          >
            ▶ Listen
          </Link>
        </div>
      </div>
    </div>
  )
}
