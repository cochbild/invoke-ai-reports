// frontend/src/pages/OverviewPage.test.tsx
//
// Behavior contract that the data-fetching layer (currently `useApi`, soon
// TanStack Query — issue #20) must preserve. Tests describe what users see,
// not how the hook is implemented.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import { renderWithProviders, mockApi, fixtures } from '../test-utils'
import OverviewPage from './OverviewPage'

beforeEach(() => {
  // ResizeObserver is not implemented in jsdom but recharts asks for it
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

describe('OverviewPage — data-fetching contract', () => {
  it('renders the data once all fetches resolve', async () => {
    mockApi({
      '/api/stats/overview': fixtures.overview,
      '/api/stats/models/top': fixtures.topModels,
      '/api/stats/models/family-distribution': fixtures.familyDistribution,
      '/api/stats/trends/volume': fixtures.volumeTrend,
    })

    renderWithProviders(<OverviewPage />)

    // The four StatCard labels are rendered immediately
    expect(screen.getByText('Total Images')).toBeInTheDocument()
    expect(screen.getByText('Models Used')).toBeInTheDocument()
    expect(screen.getByText('Favorite Model')).toBeInTheDocument()
    expect(screen.getByText('Active Since')).toBeInTheDocument()

    // After fetches resolve, the values appear (formatted total, top model name)
    await waitFor(() => {
      expect(screen.getByText('14,590')).toBeInTheDocument()
      expect(screen.getByText('Juggernaut XL v9')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
    })
  })

  it('refetches when the user filter changes', async () => {
    let callsForOverview = 0
    const fetchMock = mockApi({
      '/api/stats/overview': () => {
        callsForOverview += 1
        return fixtures.overview
      },
      '/api/stats/models/top': fixtures.topModels,
      '/api/stats/models/family-distribution': fixtures.familyDistribution,
      '/api/stats/trends/volume': fixtures.volumeTrend,
    })

    const { rerender } = renderWithProviders(<OverviewPage />, { initialPath: '/' })
    await waitFor(() => expect(callsForOverview).toBe(1))

    // Simulate the user-filter change by remounting at a path with ?user=alice.
    // FilterProvider reads useSearchParams, so a new initialPath drives a new
    // filters object and the data hook should refetch.
    rerender(<></>)
    cleanup()
    renderWithProviders(<OverviewPage />, { initialPath: '/?user=alice' })

    await waitFor(() => {
      expect(callsForOverview).toBeGreaterThanOrEqual(2)
      // Most-recent /overview call carries user_id=alice
      const lastOverviewCall = fetchMock.mock.calls
        .map((c) => c[0] as string)
        .filter((u) => u.startsWith('/api/stats/overview'))
        .pop()!
      expect(lastOverviewCall).toContain('user_id=alice')
    })
  })

  it('refetches when the date-range filter changes', async () => {
    const fetchMock = mockApi({
      '/api/stats/overview': fixtures.overview,
      '/api/stats/models/top': fixtures.topModels,
      '/api/stats/models/family-distribution': fixtures.familyDistribution,
      '/api/stats/trends/volume': fixtures.volumeTrend,
    })

    renderWithProviders(<OverviewPage />, { initialPath: '/' })
    await waitFor(() => expect(screen.getByText('14,590')).toBeInTheDocument())

    cleanup()
    fetchMock.mockClear()
    renderWithProviders(<OverviewPage />, { initialPath: '/?range=7d' })

    await waitFor(() => {
      const overviewCall = fetchMock.mock.calls
        .map((c) => c[0] as string)
        .find((u) => u.startsWith('/api/stats/overview'))!
      // 7d range resolves to start_date / end_date params on the API call
      expect(overviewCall).toContain('start_date=')
      expect(overviewCall).toContain('end_date=')
    })
  })

  it('renders an error state when a chart query fails', async () => {
    mockApi({
      '/api/stats/overview': fixtures.overview,
      '/api/stats/models/top': { status: 500, body: { detail: 'boom' } },
      '/api/stats/models/family-distribution': fixtures.familyDistribution,
      '/api/stats/trends/volume': fixtures.volumeTrend,
    })

    renderWithProviders(<OverviewPage />)

    // The Top Models ChartCard surfaces the error inline; other cards still load
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      expect(screen.getByText('Juggernaut XL v9')).toBeInTheDocument() // overview still loaded
    })
  })

  it('does not show stale data after a failed refetch', async () => {
    let nthCall = 0
    mockApi({
      '/api/stats/overview': () => {
        nthCall += 1
        if (nthCall === 1) return fixtures.overview
        // Second call (after filter change) fails
        throw new Error('network down')
      },
      '/api/stats/models/top': fixtures.topModels,
      '/api/stats/models/family-distribution': fixtures.familyDistribution,
      '/api/stats/trends/volume': fixtures.volumeTrend,
    })

    renderWithProviders(<OverviewPage />, { initialPath: '/' })
    await waitFor(() => expect(screen.getByText('14,590')).toBeInTheDocument())

    cleanup()
    renderWithProviders(<OverviewPage />, { initialPath: '/?user=alice' })

    // After the failed second fetch, the StatCard should fall back to the placeholder,
    // not silently show the old (now-incorrect) value.
    await waitFor(() => {
      expect(screen.queryByText('14,590')).not.toBeInTheDocument()
    })
  })
})
