// frontend/src/pages/ModelsPage.test.tsx
//
// Coverage for the Table-rendering path. Different Chakra v3 components from
// OverviewPage (Table.Root / Table.Body / Table.Cell), so worth a separate
// canary against the same data-fetching contract.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import { renderWithProviders, mockApi } from '../test-utils'
import ModelsPage from './ModelsPage'

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const TOP = [
  { model_name: 'Juggernaut XL v9', model_base: 'sdxl', count: 5230 },
  { model_name: 'flux1Dev', model_base: 'flux', count: 3120 },
]
const LEAST = [
  { model_name: 'OldCheckpoint', model_base: 'sd-1', count: 2 },
]
const FAMILIES = [
  { model_base: 'sdxl', count: 8000 },
  { model_base: 'flux', count: 5000 },
]
const LEADERBOARD = [
  {
    model_name: 'Juggernaut XL v9', model_base: 'sdxl', count: 5230,
    avg_steps: 30, avg_cfg: 7.5, common_resolution: '1024x1024',
    first_used: '2026-01-15 10:30:00', last_used: '2026-04-20 18:00:00',
  },
]
const UNUSED = [
  {
    key: 'k-1', name: 'NeverUsedFlux', base: 'flux', type: 'main',
    format: 'checkpoint', file_size: 23_809_874_063,
    description: null, source: 'huggingface.co/test',
  },
]

describe('ModelsPage — table rendering contract', () => {
  it('renders the Least Used and Leaderboard tables once data resolves', async () => {
    mockApi({
      '/api/stats/models/top': TOP,
      '/api/stats/models/least': LEAST,
      '/api/stats/models/family-distribution': FAMILIES,
      '/api/stats/models/leaderboard': LEADERBOARD,
      '/api/stats/models/unused': UNUSED,
    })

    renderWithProviders(<ModelsPage />)

    await waitFor(() => {
      expect(screen.getByText('OldCheckpoint')).toBeInTheDocument()
      // Leaderboard row text
      expect(screen.getByText('1024x1024')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument() // avg_steps
      // Never-used section: name + size appear in both row and summary
      expect(screen.getByText('NeverUsedFlux')).toBeInTheDocument()
      expect(screen.getAllByText(/22\.17 GB/).length).toBeGreaterThan(0)
    })
  })

  it('refetches all four queries when filters change', async () => {
    const fetchMock = mockApi({
      '/api/stats/models/top': TOP,
      '/api/stats/models/least': LEAST,
      '/api/stats/models/family-distribution': FAMILIES,
      '/api/stats/models/leaderboard': LEADERBOARD,
      '/api/stats/models/unused': UNUSED,
    })

    renderWithProviders(<ModelsPage />, { initialPath: '/models' })
    await waitFor(() => expect(screen.getByText('OldCheckpoint')).toBeInTheDocument())

    cleanup()
    fetchMock.mockClear()
    renderWithProviders(<ModelsPage />, { initialPath: '/models?user=alice&range=30d' })

    await waitFor(() => {
      const allUrls = fetchMock.mock.calls.map((c) => c[0] as string)
      // Each of the four endpoints fires at least once with the new filters
      const fired = ['/api/stats/models/top', '/api/stats/models/least',
                     '/api/stats/models/family-distribution', '/api/stats/models/leaderboard']
      for (const endpoint of fired) {
        const matching = allUrls.find((u) => u.startsWith(endpoint))
        expect(matching, `expected fetch to ${endpoint} after filter change`).toBeDefined()
        expect(matching).toContain('user_id=alice')
      }
    })
  })

  it('a failed leaderboard query surfaces inline without breaking the page', async () => {
    mockApi({
      '/api/stats/models/top': TOP,
      '/api/stats/models/least': LEAST,
      '/api/stats/models/family-distribution': FAMILIES,
      '/api/stats/models/leaderboard': { status: 503, body: { detail: 'unavailable' } },
      '/api/stats/models/unused': UNUSED,
    })

    renderWithProviders(<ModelsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      // Sibling chart still rendered fine
      expect(screen.getByText('OldCheckpoint')).toBeInTheDocument()
    })
  })
})
