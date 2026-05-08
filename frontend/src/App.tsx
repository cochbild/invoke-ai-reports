// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Spinner } from '@chakra-ui/react'
import Layout from './components/Layout'
import { fetchSyncStatus } from './api/client'

// Exported so SetupPage can invalidate this exact key after a successful
// import — otherwise the gate stays stuck on the no-data branch and
// navigate('/') bounces back to /setup.
export const SYNC_STATUS_QUERY_KEY = ['sync-status'] as const

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
  const { data, isPending } = useQuery({
    queryKey: SYNC_STATUS_QUERY_KEY,
    queryFn: fetchSyncStatus,
  })

  if (isPending) return null // loading

  const hasData = data?.last_sync != null

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
