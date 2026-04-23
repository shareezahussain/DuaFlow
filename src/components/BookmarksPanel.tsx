import { useApp } from '../context/AppContext'
import { useQuranContent } from '../context/QuranContentContext'
import { removeBookmark } from '../services/bookmarksApi'
import DuaListPanel from './DuaListPanel'

interface Props {
  onClose: () => void
}

export default function BookmarksPanel({ onClose }: Props) {
  const { userToken, bookmarkMap, setBookmarkMap } = useApp()
  const { duas } = useQuranContent()

  const items = duas.filter(d => String(d.id) in bookmarkMap)

  async function handleRemove(duaId: number) {
    const key = String(duaId)
    const bookmarkId = bookmarkMap[key]
    if (!bookmarkId || !userToken) return
    await removeBookmark(userToken, bookmarkId)
    const updated = { ...bookmarkMap }
    delete updated[key]
    setBookmarkMap(updated)
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
