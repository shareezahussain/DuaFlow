import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './src/context/AppContext'
import { QuranContentProvider } from './src/context/QuranContentContext'
import RootPage from './src/pages/RootPage'
import DuaDetailPage from './src/pages/DuaDetailPage'
import PrintDesignerPage from './src/pages/PrintDesignerPage'
import AuthCallbackPage from './src/pages/AuthCallbackPage'
import Toast from './src/components/Toast'

// Loads bookmarks on mount for returning visitors (userToken persisted, bookmarkMap is not).
function BookmarkLoader() {
  const { userToken, loadBookmarks } = useApp()

  useEffect(() => {
    if (userToken) loadBookmarks()
  }, [userToken]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function App() {
  return (
    <AppProvider>
      <QuranContentProvider>
        <BrowserRouter>
          <BookmarkLoader />
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
