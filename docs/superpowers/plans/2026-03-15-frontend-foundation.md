# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete React frontend — dark-themed dashboard with 5 analytics pages, setup flow, and settings — connecting to the existing FastAPI backend.

**Architecture:** React SPA with Chakra UI (dark mode), Recharts for charts, React Router for navigation. A global FilterContext provides user and date range state consumed by all pages. A typed API client talks to the FastAPI backend. In dev, Vite proxies `/api` to the backend; in production, FastAPI serves the built static files.

**Tech Stack:** React 18, TypeScript, Vite, Chakra UI v2, Recharts, React Router v6, Vitest

---

## File Structure

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── main.tsx                  # Entry point — Chakra + Router providers
    ├── App.tsx                   # Route definitions + layout wrapper
    ├── theme.ts                  # Chakra dark theme matching InvokeAI
    ├── api/
    │   └── client.ts             # Typed fetch functions for all endpoints
    ├── context/
    │   └── FilterContext.tsx      # Global user + date range state
    ├── hooks/
    │   └── useApi.ts             # Generic data-fetching hook with filter awareness
    ├── components/
    │   ├── Layout.tsx            # Page shell — top bar + scrollable content
    │   ├── TopBar.tsx            # Nav tabs, user selector, date range, sync btn
    │   ├── StatCard.tsx          # Single KPI metric card
    │   └── ChartCard.tsx         # Card wrapper with title for chart sections
    └── pages/
        ├── SetupPage.tsx         # First-run: path input → validate → import
        ├── OverviewPage.tsx      # KPIs + top models + family donut + activity
        ├── ModelsPage.tsx        # Model analytics (charts + leaderboard table)
        ├── PromptsPage.tsx       # Token analysis + prompt length
        ├── TrendsPage.tsx        # Volume, heatmap, parameter trends
        ├── GenerationPage.tsx    # Resolution, scheduler, steps, CFG, LoRA, errors
        └── SettingsPage.tsx      # Config management + sync history + clear
```

---

## Chunk 1: Project Setup, Theme, API Client & Layout

### Task 1: Vite + React + TypeScript Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Initialize frontend project**

```bash
cd C:\Users\dalec\source\repos\invoke-ai-reports
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion recharts react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vite with API proxy**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9876',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `frontend/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create minimal main.tsx**

Replace `frontend/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { theme } from './theme'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode="dark" />
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 6: Create placeholder App.tsx**

Create `frontend/src/App.tsx`:

```tsx
import { Box, Heading } from '@chakra-ui/react'

export default function App() {
  return (
    <Box p={8}>
      <Heading>InvokeAI Reports</Heading>
    </Box>
  )
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — should show "InvokeAI Reports" heading on dark background.

- [ ] **Step 8: Commit**

```bash
cd .. && git add frontend/ && git commit -m "chore: scaffold React frontend with Vite, Chakra UI, and dev proxy"
```

---

### Task 2: Dark Theme

**Files:**
- Create: `frontend/src/theme.ts`

- [ ] **Step 1: Create InvokeAI-inspired dark theme**

```typescript
// frontend/src/theme.ts
import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: '#1a1a2e',
        color: '#e2e8f0',
      },
    },
  },
  colors: {
    brand: {
      50: '#e6f0ff',
      100: '#b3d4ff',
      200: '#80b8ff',
      300: '#4d9cff',
      400: '#1a80ff',
      500: '#0066e6',
      600: '#0050b3',
      700: '#003a80',
      800: '#00254d',
      900: '#000f1a',
    },
    surface: {
      bg: '#16213e',
      card: '#1a1a2e',
      cardHover: '#1f2544',
      border: '#2a2d4a',
    },
    accent: {
      blue: '#4d9cff',
      purple: '#9f7aea',
      teal: '#38b2ac',
      orange: '#ed8936',
      pink: '#ed64a6',
      green: '#48bb78',
      red: '#fc8181',
      yellow: '#f6e05e',
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: '#16213e',
          borderColor: '#2a2d4a',
          borderWidth: '1px',
          borderRadius: 'lg',
        },
      },
    },
    Table: {
      variants: {
        simple: {
          th: { color: 'gray.400', borderColor: '#2a2d4a' },
          td: { borderColor: '#2a2d4a' },
        },
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            color: 'gray.400',
            _selected: { color: 'accent.blue', borderColor: 'accent.blue' },
          },
        },
      },
    },
  },
})

// Consistent chart color palette
export const CHART_COLORS = [
  '#4d9cff', '#9f7aea', '#38b2ac', '#ed8936',
  '#ed64a6', '#48bb78', '#fc8181', '#f6e05e',
  '#4fd1c5', '#b794f4',
]
```

- [ ] **Step 2: Verify theme applies**

```bash
cd frontend && npm run dev
```

Page should have dark navy background `#1a1a2e`.

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/src/theme.ts && git commit -m "feat: add InvokeAI-inspired dark theme with chart colors"
```

---

### Task 3: Typed API Client

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/client.test.ts`

- [ ] **Step 1: Write API client tests**

Create `frontend/src/api/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchOverview, fetchTopModels, fetchUsers, validatePath, triggerSync } from './client'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('API client', () => {
  it('fetchOverview sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ total_images: 100, models_used: 5, top_model: 'Test' }),
    })
    const result = await fetchOverview()
    expect(mockFetch).toHaveBeenCalledWith('/api/stats/overview?')
    expect(result.total_images).toBe(100)
  })

  it('fetchOverview passes filters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ total_images: 50 }),
    })
    await fetchOverview({ user_id: 'user-1', start_date: '2026-01-01', end_date: '2026-02-01' })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('user_id=user-1')
    expect(url).toContain('start_date=2026-01-01')
  })

  it('fetchTopModels passes limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ model_name: 'A', count: 10 }]),
    })
    await fetchTopModels({ limit: 5 })
    expect(mockFetch.mock.calls[0][0]).toContain('limit=5')
  })

  it('fetchUsers returns user list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ user_id: 'u1', display_name: 'Alice', image_count: 10 }]),
    })
    const users = await fetchUsers()
    expect(users[0].display_name).toBe('Alice')
  })

  it('validatePath sends POST with path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true, image_count: 100 }),
    })
    await validatePath('/some/path')
    expect(mockFetch).toHaveBeenCalledWith('/api/validate-path', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ path: '/some/path' }),
    }))
  })

  it('triggerSync sends POST with invoke_path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ images_imported: 100 }),
    })
    await triggerSync('/some/path')
    expect(mockFetch).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ invoke_path: '/some/path' }),
    }))
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    await expect(fetchOverview()).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/api/client.test.ts
```

- [ ] **Step 3: Implement API client**

Create `frontend/src/api/client.ts`:

```typescript
// frontend/src/api/client.ts

// --- Types ---

export interface Filters {
  user_id?: string
  start_date?: string
  end_date?: string
}

export interface OverviewStats {
  total_images: number
  models_used: number
  top_model: string | null
  first_date: string | null
  last_date: string | null
}

export interface ModelStat {
  model_name: string
  model_base: string | null
  count: number
}

export interface LeaderboardEntry extends ModelStat {
  avg_steps: number | null
  avg_cfg: number | null
  common_resolution: string | null
  first_used: string | null
  last_used: string | null
}

export interface FamilyDist {
  model_base: string
  count: number
}

export interface TokenStat {
  token: string
  count: number
}

export interface LengthBucket {
  bucket: string
  count: number
}

export interface VolumeTrend {
  period: string
  count: number
}

export interface HeatmapCell {
  day_of_week: number
  hour: number
  count: number
}

export interface ParameterTrend {
  period: string
  avg_steps: number | null
  avg_cfg: number | null
}

export interface ResolutionStat {
  resolution: string
  width: number
  height: number
  count: number
}

export interface SchedulerStat {
  scheduler: string
  count: number
}

export interface StepsStat {
  steps: number
  count: number
}

export interface CfgStat {
  cfg_scale: number
  count: number
}

export interface LoraStats {
  total_with_lora: number
  pct_with_lora: number
  top_loras: { lora_name: string; count: number }[]
}

export interface ErrorStats {
  total_items: number
  total_failed: number
  failure_rate: number
  by_error_type: { error_type: string; count: number }[]
  by_model: { model_name: string; count: number }[]
}

export interface UserInfo {
  user_id: string
  display_name: string | null
  image_count: number
}

export interface SyncStatus {
  last_sync: string | null
  source_path: string | null
  images_imported: number | null
  queue_items_imported: number | null
}

export interface SyncResult {
  images_imported: number
  queue_items_imported: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
  image_count?: number
  user_count?: number
  model_count?: number
}

export interface AppSettings {
  invoke_path: string | null
  last_sync: string | null
}

// --- Helpers ---

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }
  const resp = await fetch(`${path}?${searchParams}`)
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  return resp.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  return resp.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  return resp.json()
}

// --- API Functions ---

export const fetchOverview = (f: Filters = {}) =>
  get<OverviewStats>('/api/stats/overview', f)

export const fetchTopModels = (p: Filters & { limit?: number } = {}) =>
  get<ModelStat[]>('/api/stats/models/top', p)

export const fetchLeastModels = (p: Filters & { limit?: number } = {}) =>
  get<ModelStat[]>('/api/stats/models/least', p)

export const fetchFamilyDistribution = (f: Filters = {}) =>
  get<FamilyDist[]>('/api/stats/models/family-distribution', f)

export const fetchLeaderboard = (f: Filters = {}) =>
  get<LeaderboardEntry[]>('/api/stats/models/leaderboard', f)

export const fetchTopTokens = (p: Filters & { limit?: number } = {}) =>
  get<TokenStat[]>('/api/stats/prompts/top-tokens', p)

export const fetchLengthDistribution = (f: Filters = {}) =>
  get<LengthBucket[]>('/api/stats/prompts/length-distribution', f)

export const fetchVolumeTrend = (p: Filters & { granularity?: string } = {}) =>
  get<VolumeTrend[]>('/api/stats/trends/volume', p)

export const fetchHeatmap = (f: Filters = {}) =>
  get<HeatmapCell[]>('/api/stats/trends/heatmap', f)

export const fetchParameterTrends = (p: Filters & { granularity?: string } = {}) =>
  get<ParameterTrend[]>('/api/stats/trends/parameters', p)

export const fetchResolutions = (f: Filters = {}) =>
  get<ResolutionStat[]>('/api/stats/generation/resolutions', f)

export const fetchSchedulers = (f: Filters = {}) =>
  get<SchedulerStat[]>('/api/stats/generation/schedulers', f)

export const fetchSteps = (f: Filters = {}) =>
  get<StepsStat[]>('/api/stats/generation/steps', f)

export const fetchCfg = (f: Filters = {}) =>
  get<CfgStat[]>('/api/stats/generation/cfg', f)

export const fetchLoras = (f: Filters = {}) =>
  get<LoraStats>('/api/stats/generation/loras', f)

export const fetchErrors = (f: Filters = {}) =>
  get<ErrorStats>('/api/stats/generation/errors', f)

export const fetchUsers = () =>
  get<UserInfo[]>('/api/users')

export const fetchSyncStatus = () =>
  get<SyncStatus>('/api/sync/status')

export const triggerSync = (invoke_path: string) =>
  post<SyncResult>('/api/sync', { invoke_path })

export const validatePath = (path: string) =>
  post<ValidationResult>('/api/validate-path', { path })

export const fetchSettings = () =>
  get<AppSettings>('/api/settings')

export const updateSettings = (invoke_path: string) =>
  put<{ invoke_path: string }>('/api/settings', { invoke_path })

export const clearData = () =>
  post<{ status: string }>('/api/settings/clear', {})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/api/client.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/api/ && git commit -m "feat: add typed API client with full endpoint coverage"
```

---

### Task 4: Filter Context & Data Hook

**Files:**
- Create: `frontend/src/context/FilterContext.tsx`
- Create: `frontend/src/hooks/useApi.ts`

- [ ] **Step 1: Create FilterContext**

```tsx
// frontend/src/context/FilterContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react'
import type { Filters } from '../api/client'

interface FilterState {
  filters: Filters
  setUserId: (id: string | undefined) => void
  setDateRange: (start: string | undefined, end: string | undefined) => void
  clearFilters: () => void
}

const FilterContext = createContext<FilterState | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>({})

  const setUserId = (id: string | undefined) =>
    setFilters(prev => ({ ...prev, user_id: id }))

  const setDateRange = (start: string | undefined, end: string | undefined) =>
    setFilters(prev => ({ ...prev, start_date: start, end_date: end }))

  const clearFilters = () => setFilters({})

  return (
    <FilterContext.Provider value={{ filters, setUserId, setDateRange, clearFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
```

- [ ] **Step 2: Create useApi data-fetching hook**

```tsx
// frontend/src/hooks/useApi.ts
import { useState, useEffect, useCallback } from 'react'
import { useFilters } from '../context/FilterContext'
import type { Filters } from '../api/client'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  fetcher: (filters: Filters) => Promise<T>,
  extraParams?: Record<string, unknown>,
): UseApiResult<T> {
  const { filters } = useFilters()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paramsKey = JSON.stringify({ ...filters, ...extraParams })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const merged = { ...filters, ...extraParams } as Filters & Record<string, unknown>
      const result = await fetcher(merged as any)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [paramsKey])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}

export function useApiNoFilter<T>(fetcher: () => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
```

- [ ] **Step 3: Wire FilterProvider into main.tsx**

Update `frontend/src/main.tsx` — wrap `<App />` with `<FilterProvider>`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { theme } from './theme'
import { FilterProvider } from './context/FilterContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode="dark" />
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <FilterProvider>
          <App />
        </FilterProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/src/context/ frontend/src/hooks/ frontend/src/main.tsx && git commit -m "feat: add filter context and data-fetching hook"
```

---

### Task 5: Shared UI Components

**Files:**
- Create: `frontend/src/components/StatCard.tsx`
- Create: `frontend/src/components/ChartCard.tsx`

- [ ] **Step 1: Create StatCard**

```tsx
// frontend/src/components/StatCard.tsx
import { Card, CardBody, Stat, StatLabel, StatNumber, StatHelpText, Skeleton } from '@chakra-ui/react'

interface StatCardProps {
  label: string
  value: string | number | null | undefined
  helpText?: string
  loading?: boolean
}

export default function StatCard({ label, value, helpText, loading }: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <Stat>
          <StatLabel color="gray.400" fontSize="sm">{label}</StatLabel>
          <Skeleton isLoaded={!loading} mt={1}>
            <StatNumber fontSize="2xl" color="accent.blue">
              {value ?? '—'}
            </StatNumber>
          </Skeleton>
          {helpText && <StatHelpText color="gray.500">{helpText}</StatHelpText>}
        </Stat>
      </CardBody>
    </Card>
  )
}
```

- [ ] **Step 2: Create ChartCard**

```tsx
// frontend/src/components/ChartCard.tsx
import { Card, CardBody, CardHeader, Heading, Skeleton, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
  loading?: boolean
  error?: string | null
  height?: string
}

export default function ChartCard({ title, children, loading, error, height = '300px' }: ChartCardProps) {
  return (
    <Card>
      <CardHeader pb={0}>
        <Heading size="sm" color="gray.300">{title}</Heading>
      </CardHeader>
      <CardBody>
        {error ? (
          <Text color="red.300">Error: {error}</Text>
        ) : loading ? (
          <Skeleton height={height} borderRadius="md" />
        ) : (
          children
        )}
      </CardBody>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/src/components/ && git commit -m "feat: add StatCard and ChartCard shared components"
```

---

### Task 6: Top Bar & Layout Shell

**Files:**
- Create: `frontend/src/components/TopBar.tsx`
- Create: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Create TopBar**

```tsx
// frontend/src/components/TopBar.tsx
import {
  Box, Flex, Heading, HStack, Select, Button, Input, IconButton,
  useToast, Tabs, TabList, Tab,
} from '@chakra-ui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useFilters } from '../context/FilterContext'
import { fetchUsers, triggerSync, fetchSettings } from '../api/client'
import type { UserInfo } from '../api/client'

const NAV_ITEMS = [
  { label: 'Overview', path: '/' },
  { label: 'Models', path: '/models' },
  { label: 'Prompts', path: '/prompts' },
  { label: 'Trends', path: '/trends' },
  { label: 'Generation', path: '/generation' },
]

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
]

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { filters, setUserId, setDateRange } = useFilters()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [syncing, setSyncing] = useState(false)
  const [invokePath, setInvokePath] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<number>(0) // 0 = All
  const toast = useToast()

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => {})
    fetchSettings().then(s => setInvokePath(s.invoke_path)).catch(() => {})
  }, [])

  const currentTab = NAV_ITEMS.findIndex(n => n.path === location.pathname)

  const handleSync = async () => {
    if (!invokePath) return
    setSyncing(true)
    try {
      const result = await triggerSync(invokePath)
      toast({
        title: 'Sync complete',
        description: `Imported ${result.images_imported} images, ${result.queue_items_imported} queue items`,
        status: 'success', duration: 4000,
      })
      navigate(0) // refresh current route
    } catch {
      toast({ title: 'Sync failed', status: 'error', duration: 4000 })
    } finally {
      setSyncing(false)
    }
  }

  const handlePreset = (days: number) => {
    setActivePreset(days)
    if (days === 0) {
      setDateRange(undefined, undefined)
    } else {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - days)
      setDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
    }
  }

  return (
    <Box bg="surface.bg" borderBottom="1px" borderColor="surface.border" px={6} py={2}>
      <Flex align="center" justify="space-between">
        <HStack spacing={6}>
          <Heading size="md" color="accent.blue" cursor="pointer" onClick={() => navigate('/')}>
            InvokeAI Reports
          </Heading>
          <Tabs
            variant="line"
            index={currentTab >= 0 ? currentTab : undefined}
            onChange={i => navigate(NAV_ITEMS[i].path)}
            size="sm"
          >
            <TabList borderBottomColor="surface.border">
              {NAV_ITEMS.map(n => <Tab key={n.path}>{n.label}</Tab>)}
            </TabList>
          </Tabs>
        </HStack>

        <HStack spacing={3}>
          <Select
            size="sm" w="160px"
            value={filters.user_id || ''}
            onChange={e => setUserId(e.target.value || undefined)}
            bg="surface.card" borderColor="surface.border"
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.display_name || u.user_id} ({u.image_count})
              </option>
            ))}
          </Select>

          <HStack spacing={1}>
            {DATE_PRESETS.map(p => (
              <Button key={p.label} size="xs"
                variant={activePreset === p.days ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => handlePreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </HStack>

          <Input
            type="date" size="sm" w="140px"
            value={filters.start_date || ''}
            onChange={e => setDateRange(e.target.value || undefined, filters.end_date)}
            bg="surface.card" borderColor="surface.border"
          />
          <Input
            type="date" size="sm" w="140px"
            value={filters.end_date || ''}
            onChange={e => setDateRange(filters.start_date, e.target.value || undefined)}
            bg="surface.card" borderColor="surface.border"
          />

          <Button
            size="sm" colorScheme="blue" variant="outline"
            onClick={handleSync} isLoading={syncing}
            isDisabled={!invokePath}
          >
            Sync
          </Button>
          <IconButton
            aria-label="Settings" size="sm" variant="ghost"
            icon={<Box as="span" fontSize="lg">&#9881;</Box>}
            onClick={() => navigate('/settings')}
          />
        </HStack>
      </Flex>
    </Box>
  )
}
```

- [ ] **Step 2: Create Layout**

```tsx
// frontend/src/components/Layout.tsx
import { Box } from '@chakra-ui/react'
import TopBar from './TopBar'
import { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" bg="#1a1a2e">
      <TopBar />
      <Box p={6} maxW="1400px" mx="auto">
        {children}
      </Box>
    </Box>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/src/components/ && git commit -m "feat: add top bar with nav, filters, sync, and layout shell"
```

---

### Task 7: App Router with All Pages

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: placeholder page files

- [ ] **Step 1: Create placeholder pages**

Create each page as a minimal placeholder. One file per page:

`frontend/src/pages/SetupPage.tsx`:
```tsx
import { Box, Heading } from '@chakra-ui/react'
export default function SetupPage() {
  return <Box p={8}><Heading>Setup</Heading></Box>
}
```

Create identical placeholders for: `OverviewPage.tsx`, `ModelsPage.tsx`, `PromptsPage.tsx`, `TrendsPage.tsx`, `GenerationPage.tsx`, `SettingsPage.tsx` — each with their respective name.

- [ ] **Step 2: Wire up App.tsx with routes**

```tsx
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
```

- [ ] **Step 3: Verify the app builds and routes work**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/src/ && git commit -m "feat: add routing with setup redirect and page placeholders"
```

---

## Chunk 2: Setup Page & Settings Page

### Task 8: Setup Page (First-Run Flow)

**Files:**
- Modify: `frontend/src/pages/SetupPage.tsx`

- [ ] **Step 1: Implement setup page**

```tsx
// frontend/src/pages/SetupPage.tsx
import {
  Box, VStack, Heading, Text, Input, Button, Alert, AlertIcon,
  Card, CardBody, HStack, Stat, StatLabel, StatNumber, useToast, Spinner,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validatePath, triggerSync, updateSettings } from '../api/client'
import type { ValidationResult } from '../api/client'

export default function SetupPage() {
  const [path, setPath] = useState('')
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const handleValidate = async () => {
    if (!path.trim()) return
    setValidating(true)
    setError(null)
    setValidation(null)
    try {
      const result = await validatePath(path.trim())
      if (result.valid) {
        setValidation(result)
      } else {
        setError(result.error || 'Invalid path. Make sure this points to your InvokeAI installation folder containing databases/invokeai.db')
      }
    } catch {
      setError('Could not connect to backend. Is the server running?')
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      await updateSettings(path.trim())
      const result = await triggerSync(path.trim())
      toast({
        title: 'Import complete!',
        description: `Imported ${result.images_imported} images and ${result.queue_items_imported} queue items.`,
        status: 'success', duration: 5000,
      })
      setTimeout(() => navigate('/'), 1500)
    } catch {
      setError('Import failed. Check the server logs for details.')
      setImporting(false)
    }
  }

  return (
    <Box minH="100vh" bg="#1a1a2e" display="flex" alignItems="center" justifyContent="center">
      <Card maxW="600px" w="full" mx={4}>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <VStack spacing={2}>
              <Heading size="lg" color="accent.blue">InvokeAI Reports</Heading>
              <Text color="gray.400" textAlign="center">
                Enter the path to your InvokeAI installation to get started.
              </Text>
            </VStack>

            <VStack spacing={3}>
              <Input
                placeholder="e.g., C:\InvokeAI or /home/user/invokeai"
                value={path}
                onChange={e => { setPath(e.target.value); setValidation(null); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                bg="surface.card" borderColor="surface.border"
                size="lg"
              />
              <Button
                colorScheme="blue" w="full"
                onClick={handleValidate}
                isLoading={validating}
                isDisabled={!path.trim()}
              >
                Validate Path
              </Button>
            </VStack>

            {error && (
              <Alert status="error" borderRadius="md" bg="red.900">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {validation && (
              <VStack spacing={4}>
                <Alert status="success" borderRadius="md" bg="green.900">
                  <AlertIcon />
                  Database found! Ready to import.
                </Alert>
                <HStack spacing={4} w="full">
                  <Stat>
                    <StatLabel color="gray.400">Images</StatLabel>
                    <StatNumber color="accent.blue">{validation.image_count?.toLocaleString()}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.400">Models</StatLabel>
                    <StatNumber color="accent.purple">{validation.model_count}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.400">Users</StatLabel>
                    <StatNumber color="accent.teal">{validation.user_count}</StatNumber>
                  </Stat>
                </HStack>
                <Button
                  colorScheme="green" w="full" size="lg"
                  onClick={handleImport}
                  isLoading={importing}
                  loadingText="Importing..."
                >
                  Import Data
                </Button>
              </VStack>
            )}
          </VStack>
        </CardBody>
      </Card>
    </Box>
  )
}
```

- [ ] **Step 2: Verify in browser (start backend + frontend)**

```bash
# Terminal 1: backend
source .venv/Scripts/activate && uvicorn backend.app.main:app --port 9876

# Terminal 2: frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` — should show setup page (no data synced yet).

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/src/pages/SetupPage.tsx && git commit -m "feat: add first-run setup page with path validation and import"
```

---

### Task 9: Settings Page

**Files:**
- Modify: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Implement settings page**

```tsx
// frontend/src/pages/SettingsPage.tsx
import {
  VStack, Heading, Card, CardBody, CardHeader, Input, Button,
  Text, HStack, Alert, AlertIcon, useToast,
  Table, Thead, Tbody, Tr, Th, Td, Divider,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSettings, updateSettings, clearData, fetchSyncStatus } from '../api/client'
import type { AppSettings, SyncStatus } from '../api/client'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [newPath, setNewPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    fetchSettings().then(s => { setSettings(s); setNewPath(s.invoke_path || '') })
    fetchSyncStatus().then(setSyncStatus)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateSettings(newPath)
      setSettings(prev => prev ? { ...prev, invoke_path: result.invoke_path } : null)
      toast({ title: 'Settings saved', status: 'success', duration: 3000 })
    } catch {
      toast({ title: 'Failed to save', status: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('This will delete all imported data. You will need to re-import. Continue?')) return
    setClearing(true)
    try {
      await clearData()
      toast({ title: 'Data cleared', status: 'info', duration: 3000 })
      setTimeout(() => navigate('/setup'), 1000)
    } catch {
      toast({ title: 'Failed to clear data', status: 'error', duration: 3000 })
    } finally {
      setClearing(false)
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Settings</Heading>

      <Card>
        <CardHeader><Heading size="sm">InvokeAI Installation Path</Heading></CardHeader>
        <CardBody>
          <HStack>
            <Input
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              placeholder="Path to InvokeAI installation"
              bg="surface.card" borderColor="surface.border"
            />
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              Save
            </Button>
          </HStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><Heading size="sm">Sync Status</Heading></CardHeader>
        <CardBody>
          {syncStatus ? (
            <Table variant="simple" size="sm">
              <Tbody>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Last Sync</Td>
                  <Td>{syncStatus.last_sync || 'Never'}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Source Path</Td>
                  <Td>{syncStatus.source_path || '—'}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Images Imported</Td>
                  <Td>{syncStatus.images_imported?.toLocaleString() ?? '—'}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Queue Items</Td>
                  <Td>{syncStatus.queue_items_imported?.toLocaleString() ?? '—'}</Td>
                </Tr>
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.500">Loading...</Text>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><Heading size="sm" color="red.300">Danger Zone</Heading></CardHeader>
        <CardBody>
          <VStack align="start" spacing={3}>
            <Text color="gray.400">
              Clear all imported data and return to the setup screen.
              Your InvokeAI database is not affected.
            </Text>
            <Button colorScheme="red" variant="outline" onClick={handleClear} isLoading={clearing}>
              Clear All Data
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd .. && git add frontend/src/pages/SettingsPage.tsx && git commit -m "feat: add settings page with path config, sync status, and clear"
```

---

## Chunk 3: Overview, Models & Generation Pages

### Task 10: Overview Page

**Files:**
- Modify: `frontend/src/pages/OverviewPage.tsx`

- [ ] **Step 1: Implement overview page**

```tsx
// frontend/src/pages/OverviewPage.tsx
import { SimpleGrid, Box } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import {
  fetchOverview, fetchTopModels, fetchFamilyDistribution, fetchVolumeTrend,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function OverviewPage() {
  const overview = useApi(fetchOverview)
  const topModels = useApi(fetchTopModels, { limit: 5 })
  const families = useApi(fetchFamilyDistribution)
  const volume = useApi(fetchVolumeTrend, { granularity: 'week' })

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <StatCard label="Total Images" value={overview.data?.total_images?.toLocaleString()} loading={overview.loading} />
        <StatCard label="Models Used" value={overview.data?.models_used} loading={overview.loading} />
        <StatCard label="Favorite Model" value={overview.data?.top_model} loading={overview.loading} />
        <StatCard label="Active Since" value={overview.data?.first_date?.split(' ')[0]} loading={overview.loading} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Top 5 Models" loading={topModels.loading} error={topModels.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topModels.data || []} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" stroke="#718096" />
              <YAxis type="category" dataKey="model_name" stroke="#718096" width={120} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Model Family Distribution" loading={families.loading} error={families.error}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={families.data || []} dataKey="count" nameKey="model_base"
                cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                label={({ model_base, percent }) => `${model_base} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(families.data || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <ChartCard title="Generation Activity" loading={volume.loading} error={volume.error}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={volume.data || []}>
            <XAxis dataKey="period" stroke="#718096" tick={{ fontSize: 11 }} />
            <YAxis stroke="#718096" />
            <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
            <Area type="monotone" dataKey="count" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </Box>
  )
}
```

- [ ] **Step 2: Verify in browser**

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/src/pages/OverviewPage.tsx && git commit -m "feat: add overview page with KPIs, top models, family donut, and activity chart"
```

---

### Task 11: Models Page

**Files:**
- Modify: `frontend/src/pages/ModelsPage.tsx`

- [ ] **Step 1: Implement models page**

```tsx
// frontend/src/pages/ModelsPage.tsx
import { Box, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td, Heading } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import {
  fetchTopModels, fetchLeastModels, fetchFamilyDistribution, fetchLeaderboard,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function ModelsPage() {
  const topModels = useApi(fetchTopModels, { limit: 10 })
  const leastModels = useApi(fetchLeastModels, { limit: 10 })
  const families = useApi(fetchFamilyDistribution)
  const leaderboard = useApi(fetchLeaderboard)

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Most Used Models" loading={topModels.loading} error={topModels.error}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topModels.data || []} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" stroke="#718096" />
              <YAxis type="category" dataKey="model_name" stroke="#718096" width={140} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Model Family Distribution" loading={families.loading} error={families.error}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={families.data || []}>
              <XAxis dataKey="model_base" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(families.data || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <ChartCard title="Least Used Models" loading={leastModels.loading} error={leastModels.error}>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr><Th>Model</Th><Th>Family</Th><Th isNumeric>Count</Th></Tr>
          </Thead>
          <Tbody>
            {(leastModels.data || []).map(m => (
              <Tr key={m.model_name}>
                <Td>{m.model_name}</Td>
                <Td>{m.model_base}</Td>
                <Td isNumeric>{m.count}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ChartCard>

      <Box mt={4}>
        <ChartCard title="Model Leaderboard" loading={leaderboard.loading} error={leaderboard.error}>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Model</Th><Th>Family</Th><Th isNumeric>Count</Th>
                  <Th isNumeric>Avg Steps</Th><Th isNumeric>Avg CFG</Th>
                  <Th>Resolution</Th><Th>First Used</Th><Th>Last Used</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(leaderboard.data || []).map(m => (
                  <Tr key={m.model_name}>
                    <Td fontWeight="medium">{m.model_name}</Td>
                    <Td>{m.model_base}</Td>
                    <Td isNumeric>{m.count}</Td>
                    <Td isNumeric>{m.avg_steps ?? '—'}</Td>
                    <Td isNumeric>{m.avg_cfg ?? '—'}</Td>
                    <Td>{m.common_resolution ?? '—'}</Td>
                    <Td>{m.first_used?.split(' ')[0] ?? '—'}</Td>
                    <Td>{m.last_used?.split(' ')[0] ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </ChartCard>
      </Box>
    </Box>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd .. && git add frontend/src/pages/ModelsPage.tsx && git commit -m "feat: add models page with usage charts and leaderboard table"
```

---

### Task 12: Generation Page

**Files:**
- Modify: `frontend/src/pages/GenerationPage.tsx`

- [ ] **Step 1: Implement generation page**

```tsx
// frontend/src/pages/GenerationPage.tsx
import { Box, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td, Text, HStack, Progress } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import {
  fetchResolutions, fetchSchedulers, fetchSteps, fetchCfg, fetchLoras, fetchErrors,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function GenerationPage() {
  const resolutions = useApi(fetchResolutions)
  const schedulers = useApi(fetchSchedulers)
  const steps = useApi(fetchSteps)
  const cfg = useApi(fetchCfg)
  const loras = useApi(fetchLoras)
  const errors = useApi(fetchErrors)

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <StatCard label="Images with LoRA" value={loras.data?.total_with_lora} loading={loras.loading}
          helpText={loras.data ? `${loras.data.pct_with_lora}% of all` : undefined} />
        <StatCard label="Total Queue Items" value={errors.data?.total_items} loading={errors.loading} />
        <StatCard label="Failed" value={errors.data?.total_failed} loading={errors.loading}
          helpText={errors.data ? `${errors.data.failure_rate}% failure rate` : undefined} />
        <StatCard label="Top Resolution" value={resolutions.data?.[0]?.resolution} loading={resolutions.loading} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Resolution Distribution" loading={resolutions.loading} error={resolutions.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(resolutions.data || []).slice(0, 8)}>
              <XAxis dataKey="resolution" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Scheduler Usage" loading={schedulers.loading} error={schedulers.error}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={schedulers.data || []} dataKey="count" nameKey="scheduler"
                cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                label={({ scheduler, percent }) => `${scheduler} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(schedulers.data || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Steps Distribution" loading={steps.loading} error={steps.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={steps.data || []}>
              <XAxis dataKey="steps" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CFG Scale Distribution" loading={cfg.loading} error={cfg.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cfg.data || []}>
              <XAxis dataKey="cfg_scale" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <ChartCard title="Top LoRAs" loading={loras.loading} error={loras.error}>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>LoRA</Th><Th isNumeric>Used</Th></Tr></Thead>
            <Tbody>
              {(loras.data?.top_loras || []).map(l => (
                <Tr key={l.lora_name}><Td>{l.lora_name}</Td><Td isNumeric>{l.count}</Td></Tr>
              ))}
            </Tbody>
          </Table>
        </ChartCard>

        <ChartCard title="Errors by Type" loading={errors.loading} error={errors.error}>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Error Type</Th><Th isNumeric>Count</Th></Tr></Thead>
            <Tbody>
              {(errors.data?.by_error_type || []).map(e => (
                <Tr key={e.error_type}><Td>{e.error_type}</Td><Td isNumeric>{e.count}</Td></Tr>
              ))}
              {(errors.data?.by_error_type || []).length === 0 && (
                <Tr><Td colSpan={2} color="gray.500">No errors</Td></Tr>
              )}
            </Tbody>
          </Table>
        </ChartCard>
      </SimpleGrid>
    </Box>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd .. && git add frontend/src/pages/GenerationPage.tsx && git commit -m "feat: add generation page with resolution, scheduler, steps, CFG, LoRA, and error stats"
```

---

## Chunk 4: Prompts & Trends Pages

### Task 13: Prompts Page

**Files:**
- Modify: `frontend/src/pages/PromptsPage.tsx`

- [ ] **Step 1: Implement prompts page**

```tsx
// frontend/src/pages/PromptsPage.tsx
import { Box, SimpleGrid, Wrap, WrapItem, Text } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import { fetchTopTokens, fetchLengthDistribution } from '../api/client'
import { CHART_COLORS } from '../theme'

export default function PromptsPage() {
  const topTokens = useApi(fetchTopTokens, { limit: 20 })
  const cloudTokens = useApi(fetchTopTokens, { limit: 100 })
  const lengths = useApi(fetchLengthDistribution)

  const maxCount = Math.max(...(cloudTokens.data || []).map(t => t.count), 1)

  return (
    <Box>
      <ChartCard title="Token Word Cloud" loading={cloudTokens.loading} error={cloudTokens.error} height="250px">
        <Wrap spacing={2} justify="center" p={4}>
          {(cloudTokens.data || []).map((t, i) => {
            const size = 12 + (t.count / maxCount) * 28
            return (
              <WrapItem key={t.token}>
                <Text
                  fontSize={`${size}px`}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  fontWeight={size > 24 ? 'bold' : 'normal'}
                  title={`${t.token}: ${t.count}`}
                  cursor="default"
                >
                  {t.token}
                </Text>
              </WrapItem>
            )
          })}
        </Wrap>
      </ChartCard>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
        <ChartCard title="Top 20 Tokens" loading={topTokens.loading} error={topTokens.error}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topTokens.data || []} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" stroke="#718096" />
              <YAxis type="category" dataKey="token" stroke="#718096" width={140} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Prompt Length Distribution" loading={lengths.loading} error={lengths.error}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={lengths.data || []}>
              <XAxis dataKey="bucket" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>
    </Box>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd .. && git add frontend/src/pages/PromptsPage.tsx && git commit -m "feat: add prompts page with word cloud, top tokens, and length distribution"
```

---

### Task 14: Trends Page

**Files:**
- Modify: `frontend/src/pages/TrendsPage.tsx`

- [ ] **Step 1: Implement trends page**

```tsx
// frontend/src/pages/TrendsPage.tsx
import { Box, SimpleGrid, HStack, Button, Table, Thead, Tbody, Tr, Th, Td, Text } from '@chakra-ui/react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useState } from 'react'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import { fetchVolumeTrend, fetchParameterTrends, fetchHeatmap } from '../api/client'
import { CHART_COLORS } from '../theme'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TrendsPage() {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week')
  const volume = useApi(fetchVolumeTrend, { granularity })
  const params = useApi(fetchParameterTrends, { granularity })
  const heatmap = useApi(fetchHeatmap)

  // Build heatmap grid
  const heatmapGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const cell of heatmap.data || []) {
    heatmapGrid[cell.day_of_week][cell.hour] = cell.count
  }
  const heatMax = Math.max(...(heatmap.data || []).map(c => c.count), 1)

  return (
    <Box>
      <HStack mb={4} spacing={2}>
        {(['day', 'week', 'month'] as const).map(g => (
          <Button key={g} size="sm" variant={granularity === g ? 'solid' : 'outline'}
            colorScheme="blue" onClick={() => setGranularity(g)}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </Button>
        ))}
      </HStack>

      <SimpleGrid columns={{ base: 1 }} spacing={4} mb={6}>
        <ChartCard title="Generation Volume" loading={volume.loading} error={volume.error}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volume.data || []}>
              <XAxis dataKey="period" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Line type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Parameter Evolution" loading={params.loading} error={params.error}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={params.data || []}>
              <XAxis dataKey="period" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="steps" stroke={CHART_COLORS[2]} />
              <YAxis yAxisId="cfg" orientation="right" stroke={CHART_COLORS[3]} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Legend />
              <Line yAxisId="steps" type="monotone" dataKey="avg_steps" name="Avg Steps"
                stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
              <Line yAxisId="cfg" type="monotone" dataKey="avg_cfg" name="Avg CFG"
                stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <ChartCard title="Activity Heatmap" loading={heatmap.loading} error={heatmap.error} height="220px">
        <Box overflowX="auto">
          <Table size="sm" variant="unstyled">
            <Thead>
              <Tr>
                <Th w="60px"></Th>
                {Array.from({ length: 24 }, (_, h) => (
                  <Th key={h} p={1} textAlign="center" fontSize="xs" color="gray.500">
                    {h}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {DAYS.map((day, di) => (
                <Tr key={day}>
                  <Td fontSize="xs" color="gray.400" p={1}>{day}</Td>
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = heatmapGrid[di][h]
                    const intensity = count / heatMax
                    return (
                      <Td key={h} p={1}>
                        <Box
                          w="20px" h="20px" borderRadius="sm"
                          bg={count === 0 ? 'surface.border' : `rgba(77, 156, 255, ${0.15 + intensity * 0.85})`}
                          title={`${day} ${h}:00 — ${count} images`}
                        />
                      </Td>
                    )
                  })}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </ChartCard>
    </Box>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd .. && git add frontend/src/pages/TrendsPage.tsx && git commit -m "feat: add trends page with volume chart, parameter evolution, and activity heatmap"
```

---

### Task 15: Build Verification & Final Commit

- [ ] **Step 1: Run vitest**

```bash
cd frontend && npx vitest run
```
Expected: API client tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: Build succeeds, output in `frontend/dist/`.

- [ ] **Step 3: Test full stack**

```bash
# Terminal 1: Start backend (it will serve frontend/dist/)
cd .. && source .venv/Scripts/activate && uvicorn backend.app.main:app --port 9876
```

Open `http://localhost:9876` — should serve the React app. If no data synced, redirects to setup page. After setup, all 5 dashboard pages should render with data.

- [ ] **Step 4: Final commit if any remaining changes**

```bash
cd .. && git add -A && git status
# If there are changes:
git commit -m "chore: complete frontend build with all pages"
```

---

## Summary of Endpoints Not Yet Visualized

These spec endpoints exist in the backend but are not displayed on any page. They can be added later:

| Endpoint | Note |
|----------|------|
| `/api/stats/models/by-family` | Not yet implemented in backend |
| `/api/stats/models/family-trends` | Not yet implemented in backend |
| `/api/stats/models/lora-pairings` | Not yet implemented in backend |
| `/api/stats/prompts/token-pairs` | Not yet implemented in backend |
| `/api/stats/prompts/negative` | Not yet implemented in backend |
| `/api/stats/trends/model-adoption` | Not yet implemented in backend |
