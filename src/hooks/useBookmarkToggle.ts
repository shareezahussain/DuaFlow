import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { addBookmark, removeBookmark } from '../services/bookmarksApi'

export function useBookmarkToggle(
  dua: { id: number; surah: number; ayah: number },
  onSignIn: () => void,
) {
  const { userToken, bookmarkMap, setBookmarkMap, isBookmarked } = useApp()
  const [isLoading, setIsLoading] = useState(false)
  const [showSparkle, setShowSparkle] = useState(false)

  const isBookmarkedNow = isBookmarked(dua.id)
  const key = String(dua.id)

  const toggle = useCallback(async () => {
    if (!userToken) { onSignIn(); return }
    if (isLoading) return
    setIsLoading(true)
    try {
      if (isBookmarkedNow) {
        const bmId = bookmarkMap[key]
        if (bmId) await removeBookmark(userToken, bmId).catch(() => {})
        const { [key]: _, ...rest } = bookmarkMap
        setBookmarkMap(rest)
      } else {
        try {
          const created = await addBookmark(userToken, dua.surah, dua.ayah)
          setBookmarkMap({ ...bookmarkMap, [key]: created.id ?? 'local' })
        } catch {
          setBookmarkMap({ ...bookmarkMap, [key]: 'local' })
        }
        setShowSparkle(true)
        setTimeout(() => setShowSparkle(false), 700)
      }
    } finally {
      setIsLoading(false)
    }
  }, [userToken, isLoading, isBookmarkedNow, bookmarkMap, key, dua.surah, dua.ayah, onSignIn, setBookmarkMap])

  return { isBookmarked: isBookmarkedNow, isLoading, showSparkle, toggle }
}
