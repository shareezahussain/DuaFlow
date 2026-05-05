import { useState, useCallback, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { addBookmark, removeBookmark, refreshAccessToken } from '../services/bookmarksApi'
import { toast } from '../util/toast'

export function useBookmarkToggle(
  dua: { id: number; surah: number; ayah: number },
  onSignIn: () => void,
) {
  const { userToken, updateBookmarkMap, isBookmarked } = useApp()
  const [isLoading, setIsLoading] = useState(false)
  const [showSparkle, setShowSparkle] = useState(false)

  const mountedRef   = useRef(true)
  const sparkleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (sparkleTimer.current) clearTimeout(sparkleTimer.current)
    }
  }, [])

  const isBookmarkedNow = isBookmarked(dua.id)
  const key = String(dua.id)

  const toggle = useCallback(async () => {
    if (!userToken) { onSignIn(); return }
    if (isLoading) return
    if (mountedRef.current) setIsLoading(true)

    try {
      // Read fresh state to avoid stale closures
      const { bookmarkMap, refreshToken, setUserToken } = useApp.getState()
      const bmId = bookmarkMap[key]

      // Build a refresh function so expired tokens are retried automatically.
      // refreshToken is in-memory only (not persisted) — available for the
      // lifetime of the session without a page reload.
      const refreshFn = refreshToken
        ? async () => {
            const newToken = await refreshAccessToken(refreshToken)
            setUserToken(newToken)
            return newToken
          }
        : undefined

      if (isBookmarkedNow) {
        updateBookmarkMap(curr => { const { [key]: _, ...rest } = curr; return rest })

        if (bmId && bmId !== 'local') {
          try {
            await removeBookmark(userToken, bmId, refreshFn)
            useApp.getState().flagBookmarkDeleted(bmId, key)
          } catch {
            updateBookmarkMap(curr => ({ ...curr, [key]: bmId }))
            toast('Could not remove bookmark — please try again')
          }
        }
      } else {
        updateBookmarkMap(curr => ({ ...curr, [key]: 'local' }))
        try {
          const created = await addBookmark(userToken, dua.surah, dua.ayah, refreshFn)
          const apiId = created.id ?? 'local'
          updateBookmarkMap(curr => ({ ...curr, [key]: apiId }))
          useApp.getState().flagBookmarkAdded(key, apiId)
        } catch { /* keep 'local' */ }

        toast('Dua saved to bookmarks ✓')
        if (mountedRef.current) {
          setShowSparkle(true)
          if (sparkleTimer.current) clearTimeout(sparkleTimer.current)
          sparkleTimer.current = setTimeout(() => {
            if (mountedRef.current) setShowSparkle(false)
          }, 700)
        }
      }
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [userToken, isLoading, isBookmarkedNow, key, dua.surah, dua.ayah, onSignIn, updateBookmarkMap])

  return { isBookmarked: isBookmarkedNow, isLoading, showSparkle, toggle }
}
