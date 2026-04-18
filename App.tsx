import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './src/context/AppContext'
import { QuranContentProvider } from './src/context/QuranContentContext'
import HomePage from './src/pages/HomePage'
import DuaDetailPage from './src/pages/DuaDetailPage'
import PrintDesignerPage from './src/pages/PrintDesignerPage'

export default function App() {
  return (
    <AppProvider>
      <QuranContentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dua/:id" element={<DuaDetailPage />} />
            <Route path="/print" element={<PrintDesignerPage />} />
          </Routes>
        </BrowserRouter>
      </QuranContentProvider>
    </AppProvider>
  )
}
