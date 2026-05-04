import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import { removeBookmark } from '../services/bookmarksApi'
import DuaListPanel from './DuaListPanel'

interface Props {
  onClose: () => void
}

export default function BookmarksPanel({ onClose }: Props) {
  const { userToken, bookmarkMap, updateBookmarkMap } = useApp()
  const { duas } = useQuranContent()

  const items = duas.filter(d => String(d.id) in bookmarkMap)

  async function handleRemove(duaId: number) {
    if (!userToken) return
    const key = String(duaId)
    // Read fresh state — avoids stale closure if multiple removes happen quickly
    const bookmarkId = useApp.getState().bookmarkMap[key]

    // Optimistic remove — update UI instantly regardless of network
    updateBookmarkMap(curr => { const { [key]: _, ...rest } = curr; return rest })

    if (bookmarkId && bookmarkId !== 'local') {
      await removeBookmark(userToken, bookmarkId)
        .catch(() => {
          // API failed — roll back so the dua reappears
          updateBookmarkMap(curr => ({ ...curr, [key]: bookmarkId }))
        })
    }
  }

  return (
    <DuaListPanel
      title="Saved Duas"
      items={items}
      onRemove={handleRemove}
      onClose={onClose}
    />
  )
}
