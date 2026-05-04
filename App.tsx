import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './src/context/AppContext'
import { QuranContentProvider } from './src/context/QuranContentContext'
import RootPage from './src/pages/RootPage'
import DuaDetailPage from './src/pages/DuaDetailPage'
import PrintDesignerPage from './src/pages/PrintDesignerPage'
import AuthCallbackPage from './src/pages/AuthCallbackPage'
import Toast from './src/components/Toast'

// Syncs bookmarks from the API on mount and whenever the user returns to the tab.
// Runs at app-root so every page benefits regardless of navigation path.
function BookmarkSyncer() {
  const { userToken, refreshBookmarks } = useApp()

  useEffect(() => {
    if (userToken) refreshBookmarks()
  }, [userToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onFocus = () => {
      const { userToken: t, refreshBookmarks: refresh } = useApp.getState()
      if (t) refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return null
}

export default function App() {
  return (
    <AppProvider>
      <QuranContentProvider>
        <BrowserRouter>
          <BookmarkSyncer />
          <Routes>
            <Route path="/" element={<RootPage />} />
            <Route path="/dua/:id" element={<DuaDetailPage />} />
            <Route path="/print" element={<PrintDesignerPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
          <Toast />
        </BrowserRouter>
      </QuranContentProvider>
    </AppProvider>
  )
}
