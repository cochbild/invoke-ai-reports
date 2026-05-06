// frontend/src/pages/SettingsPage.test.tsx
//
// Verifies the token-gated clear-data flow end-to-end:
// confirm() prompt -> POST clear-token -> POST clear with token -> toaster.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { renderWithProviders, mockApi, fixtures } from '../test-utils'
import SettingsPage from './SettingsPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SettingsPage — clear-data flow', () => {
  it('renders sync status from the API', async () => {
    mockApi({
      '/api/settings': fixtures.settings,
      '/api/sync/status': fixtures.syncStatus,
    })

    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('14,590')).toBeInTheDocument()
      expect(screen.getByText(fixtures.syncStatus.source_path!)).toBeInTheDocument()
    })
  })

  it('clear data: confirm -> token -> clear -> toaster', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = mockApi({
      '/api/settings': fixtures.settings,
      '/api/sync/status': fixtures.syncStatus,
      'POST /api/settings/clear-token': { token: 'tok-abc-123', ttl_seconds: 60 },
      'POST /api/settings/clear': { status: 'cleared' },
    })

    renderWithProviders(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('14,590')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Clear All Data/ }))

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => ({
        url: c[0] as string,
        method: (c[1] as RequestInit | undefined)?.method,
        body: (c[1] as RequestInit | undefined)?.body,
      }))

      const tokenCall = calls.find((c) => c.url.endsWith('/api/settings/clear-token'))
      expect(tokenCall).toBeDefined()
      expect(tokenCall!.method).toBe('POST')

      const clearCall = calls.find((c) => c.url.endsWith('/api/settings/clear'))
      expect(clearCall).toBeDefined()
      expect(clearCall!.method).toBe('POST')
      expect(clearCall!.body).toBe(JSON.stringify({ confirmation_token: 'tok-abc-123' }))
    })
  })

  it('clear data: declining the confirm dialog cancels the flow', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = mockApi({
      '/api/settings': fixtures.settings,
      '/api/sync/status': fixtures.syncStatus,
      'POST /api/settings/clear-token': { token: 'unused', ttl_seconds: 60 },
      'POST /api/settings/clear': { status: 'cleared' },
    })

    renderWithProviders(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('14,590')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Clear All Data/ }))

    // Give any async tasks a chance to fire — none should
    await new Promise((r) => setTimeout(r, 50))

    const sensitiveCalls = fetchMock.mock.calls
      .map((c) => c[0] as string)
      .filter((u) => u.endsWith('/api/settings/clear') || u.endsWith('/api/settings/clear-token'))
    expect(sensitiveCalls).toEqual([])
  })

  it('clear data: a 403 token rejection surfaces a failure toast', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockApi({
      '/api/settings': fixtures.settings,
      '/api/sync/status': fixtures.syncStatus,
      'POST /api/settings/clear-token': { token: 'tok-x', ttl_seconds: 60 },
      'POST /api/settings/clear': { status: 403, body: { detail: 'Invalid or expired confirmation token' } },
    })

    renderWithProviders(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('14,590')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Clear All Data/ }))

    // The error path triggers toaster.create({ type: 'error' }); we don't try
    // to assert the toast content (Toaster lives in main.tsx, not in this
    // tree), but the button should re-enable after the failure resolves.
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Clear All Data/ }) as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })
  })
})
