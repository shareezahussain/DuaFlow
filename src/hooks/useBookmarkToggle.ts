import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { addBookmark, removeBookmark } from '../services/bookmarksApi'

export function useBookmarkToggle(
  dua: { id: number; surah: number; ayah: number },
  onSignIn: () => void,
) {
  const { userToken, updateBookmarkMap, isBookmarked } = useApp()
  const [isLoading, setIsLoading] = useState(false)
  const [showSparkle, setShowSparkle] = useState(false)

  const isBookmarkedNow = isBookmarked(dua.id)
  const key = String(dua.id)

  const toggle = useCallback(async () => {
    if (!userToken) { onSignIn(); return }
    if (isLoading) return
    setIsLoading(true)

    try {
      // Read fresh state inside the async callback — avoids stale closure issues
      const bmId = useApp.getState().bookmarkMap[key]

      if (isBookmarkedNow) {
        // Optimistic remove — update UI instantly
        updateBookmarkMap(curr => { const { [key]: _, ...rest } = curr; return rest })

        if (bmId && bmId !== 'local') {
          await removeBookmark(userToken, bmId)
            .catch(() => {
              // API failed — roll back
              updateBookmarkMap(curr => ({ ...curr, [key]: bmId }))
            })
        }
      } else {
        // Optimistic add — mark locally so UI responds instantly
        updateBookmarkMap(curr => ({ ...curr, [key]: 'local' }))
        try {
          const created = await addBookmark(userToken, dua.surah, dua.ayah)
          // Replace 'local' placeholder with real server ID
          updateBookmarkMap(curr => ({ ...curr, [key]: created.id ?? 'local' }))
        } catch {
          // API unavailable — keep 'local' so the dua remains bookmarked offline
        }
        setShowSparkle(true)
        setTimeout(() => setShowSparkle(false), 700)
      }
    } finally {
      setIsLoading(false)
    }
  }, [userToken, isLoading, isBookmarkedNow, key, dua.surah, dua.ayah, onSignIn, updateBookmarkMap])

  return { isBookmarked: isBookmarkedNow, isLoading, showSparkle, toggle }
}
