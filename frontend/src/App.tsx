// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import SetupPage from './pages/SetupPage'
import OverviewPage from './pages/OverviewPage'
import ModelsPage from './pages/ModelsPage'
import PromptsPage from './pages/PromptsPage'
import TrendsPage from './pages/TrendsPage'
import GenerationPage from './pages/GenerationPage'
import SettingsPage from './pages/SettingsPage'
import { fetchSyncStatus } from './api/client'

export default function App() {
  const [hasData, setHasData] = useState<boolean | null>(null)

  useEffect(() => {
    fetchSyncStatus()
      .then(s => setHasData(s.last_sync !== null))
      .catch(() => setHasData(false))
  }, [])

  if (hasData === null) return null // loading

  if (!hasData) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/generation" element={<GenerationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
