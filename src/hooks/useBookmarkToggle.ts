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

  const isBookmarkedNow = isBookmarked(dua.surah, dua.ayah)
  const key = `${dua.surah}:${dua.ayah}`

  const toggle = useCallback(async () => {
    if (!userToken) { onSignIn(); return }
    if (isLoading) return
    if (mountedRef.current) setIsLoading(true)

    try {
      const { bookmarkMap, refreshToken, setUserToken, loadBookmarks } = useApp.getState()

      const refreshFn = refreshToken
        ? async () => {
            const newToken = await refreshAccessToken(refreshToken)
            setUserToken(newToken)
            return newToken
          }
        : undefined

      if (isBookmarkedNow) {
        let bmId = bookmarkMap[key]

        // If we don't have a real server ID, fetch fresh to find it before deleting
        if (!bmId || bmId === 'local') {
          await loadBookmarks()
          bmId = useApp.getState().bookmarkMap[key]
        }

        // Optimistic remove from UI
        updateBookmarkMap(curr => { const { [key]: _, ...rest } = curr; return rest })

        if (bmId && bmId !== 'local') {
          try {
            await removeBookmark(userToken, bmId, refreshFn)
            useApp.getState().flagBookmarkDeleted(bmId)
          } catch (e) {
            updateBookmarkMap(curr => ({ ...curr, [key]: bmId! }))
            const msg = e instanceof Error ? e.message : ''
            const status = parseInt(msg.match(/\d{3}/)?.[0] ?? '0')
            if (status >= 400 && status < 500) useApp.getState().signOut()
            else toast('Could not remove bookmark — please try again')
          }
        }
      } else {
        updateBookmarkMap(curr => ({ ...curr, [key]: 'local' }))
        try {
          const created = await addBookmark(userToken, dua.surah, dua.ayah, refreshFn)
          updateBookmarkMap(curr => ({ ...curr, [key]: created.id ?? 'local' }))
        } catch (e) {
          updateBookmarkMap(curr => { const { [key]: _, ...rest } = curr; return rest })
          const msg = e instanceof Error ? e.message : ''
          const status = parseInt(msg.match(/\d{3}/)?.[0] ?? '0')
          if (status >= 400 && status < 500) useApp.getState().signOut()
          else toast('Could not save bookmark — please try again')
          return
        }

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
