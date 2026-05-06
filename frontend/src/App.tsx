// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { Box, Spinner } from '@chakra-ui/react'
import Layout from './components/Layout'
import { fetchSyncStatus } from './api/client'

// Each page lives in its own chunk so recharts (~250 kB) is only loaded
// when a chart-heavy page is opened, not on first paint.
const SetupPage = lazy(() => import('./pages/SetupPage'))
const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const ModelsPage = lazy(() => import('./pages/ModelsPage'))
const PromptsPage = lazy(() => import('./pages/PromptsPage'))
const TrendsPage = lazy(() => import('./pages/TrendsPage'))
const GenerationPage = lazy(() => import('./pages/GenerationPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function PageFallback() {
  return (
    <Box display="flex" justifyContent="center" p={12}>
      <Spinner size="lg" color="accent.blue" />
    </Box>
  )
}

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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </Layout>
  )
}
