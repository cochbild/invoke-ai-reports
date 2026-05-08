// frontend/src/App.test.tsx
//
// Pins the post-setup navigation contract: completing import on SetupPage
// must move the user into the main app without a manual reload. The previous
// implementation read sync-status into local useState on mount and never
// refreshed, so navigate('/') after import bounced back to /setup.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import { renderWithProviders, mockApi } from './test-utils'
import App from './App'

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
  vi.useRealTimers()
})

describe('App — setup → main-app transition', () => {
  it('navigates to the main app after a successful import without requiring a reload', async () => {
    let lastSync: string | null = null

    mockApi({
      '/api/sync/status': () => ({
        last_sync: lastSync,
        source_path: lastSync ? '/invokeai' : null,
        images_imported: lastSync ? 100 : null,
        queue_items_imported: lastSync ? 50 : null,
      }),
      'POST /api/validate-path': {
        valid: true, image_count: 100, user_count: 1, model_count: 5,
      },
      'PUT /api/settings': { invoke_path: '/invokeai' },
      'POST /api/sync': () => {
        lastSync = '2026-05-08 10:00:00'
        return { images_imported: 100, queue_items_imported: 50 }
      },
      // Stats endpoints fire as soon as Layout mounts the OverviewPage.
      '/api/stats/overview': {
        total_images: 100, models_used: 5, top_model: 'X',
        first_date: null, last_date: null,
      },
      '/api/stats/models/top': [],
      '/api/stats/models/family-distribution': [],
      '/api/stats/trends/volume': [],
      '/api/users': [],
    })

    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderWithProviders(<App />, { initialPath: '/' })

    // Initial state: no last_sync -> user sees the Setup page
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/InvokeAI/)).toBeInTheDocument(),
    )

    fireEvent.change(screen.getByPlaceholderText(/InvokeAI/), {
      target: { value: '/invokeai' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Validate Path/ }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Import Data/ })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /Import Data/ }))

    // SetupPage delays navigate by 1500ms after a successful import
    await vi.advanceTimersByTimeAsync(2000)

    // After import, App must re-evaluate sync-status and render the main UI
    // (the SetupPage placeholder vanishes; the TopBar nav appears).
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/InvokeAI/)).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Models' })).toBeInTheDocument()
    })
  })
})
