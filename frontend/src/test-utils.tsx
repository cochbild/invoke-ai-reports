// frontend/src/test-utils.tsx
//
// Component-test harness. The point of these helpers is to capture the
// *behavior contract* the data-fetching layer must preserve across the
// upcoming TanStack Query migration (issue #20). Tests written against this
// harness should keep passing whether the underlying hook is `useApi` or
// useQuery — they verify "the page loads, refetches on filter change,
// surfaces errors, doesn't race" without coupling to implementation.

import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { system } from './theme'
import { FilterProvider } from './context/FilterContext'

interface RenderOptions {
  /** Initial path with optional ?query — feeds MemoryRouter and useSearchParams. */
  initialPath?: string
}

export function renderWithProviders(ui: ReactElement, opts: RenderOptions = {}) {
  const { initialPath = '/' } = opts
  // Fresh QueryClient per render so test cases don't leak cached data into
  // each other. `retry: false` so a failed fetch surfaces as an error
  // immediately instead of waiting for the default exponential-backoff retries.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false } },
  })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialPath]}>
          <FilterProvider>{ui}</FilterProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

// ---------------------------------------------------------------------------
// Fetch mocking
// ---------------------------------------------------------------------------
// `mockApi` maps URL pathname prefixes to canned JSON responses, so a test
// can declare "GET /api/stats/overview returns this object" without manually
// resolving Promise chains. Functions are called per-request for tests that
// want to count calls or vary responses over time.

type ResponseSpec<T = unknown> =
  | T
  | (() => T)
  | (() => Promise<T>)
  | { status: number; body?: unknown }

interface MockApiOptions {
  /** Optional artificial latency in ms — useful for testing loading states. */
  delay?: number
}

export function mockApi(
  routes: Record<string, ResponseSpec>,
  opts: MockApiOptions = {},
) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.pathname + input.search
          : input.url
    const method = init?.method ?? 'GET'

    // Find the longest matching prefix; supports `'POST /api/sync'` style keys
    // for method-disambiguated routes.
    let matched: ResponseSpec | undefined
    let matchedKey = ''
    for (const [key, spec] of Object.entries(routes)) {
      const [routeMethod, routePath] = key.includes(' ')
        ? key.split(' ', 2)
        : ['GET', key]
      if (routeMethod !== method) continue
      if (url.startsWith(routePath) && routePath.length > matchedKey.length) {
        matched = spec
        matchedKey = routePath
      }
    }
    if (matched === undefined) {
      throw new Error(`unmocked fetch: ${method} ${url}`)
    }

    if (opts.delay) await new Promise((r) => setTimeout(r, opts.delay))

    if (typeof matched === 'object' && matched !== null && 'status' in matched) {
      const { status, body } = matched as { status: number; body?: unknown }
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: 'mocked',
        json: async () => body,
      } as Response
    }

    const value = typeof matched === 'function' ? await (matched as () => unknown)() : matched
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => value,
    } as Response
  })

  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

// ---------------------------------------------------------------------------
// Sample fixtures
// ---------------------------------------------------------------------------
// Realistic enough that page assertions on rendered text can be specific.

export const fixtures = {
  overview: {
    total_images: 14590,
    models_used: 12,
    top_model: 'Juggernaut XL v9',
    first_date: '2026-01-15 10:30:00',
    last_date: '2026-04-20 18:15:00',
  },
  topModels: [
    { model_name: 'Juggernaut XL v9', model_base: 'sdxl', count: 5230 },
    { model_name: 'flux1Dev', model_base: 'flux', count: 3120 },
    { model_name: 'Z-Image Turbo', model_base: 'z-image', count: 980 },
  ],
  familyDistribution: [
    { model_base: 'sdxl', count: 8000 },
    { model_base: 'flux', count: 5000 },
    { model_base: 'z-image', count: 1590 },
  ],
  volumeTrend: [
    { period: '2026-W12', count: 120 },
    { period: '2026-W13', count: 180 },
    { period: '2026-W14', count: 240 },
  ],
  users: [
    { user_id: 'system', display_name: 'System User', image_count: 14000 },
    { user_id: 'alice', display_name: 'Alice', image_count: 590 },
  ],
  syncStatus: {
    last_sync: '2026-05-01 12:00:00',
    source_path: '/mnt/g/InvokeUi/databases/invokeai.db',
    images_imported: 14590,
    queue_items_imported: 17141,
  },
  settings: { invoke_path: '/mnt/g/InvokeUi', last_sync: '2026-05-01 12:00:00' },
}
