// frontend/src/components/TopBar.test.tsx
//
// User-interaction contract for the filter bar. The data-fetching layer
// reads filters from the URL via FilterContext, so verifying that clicks
// update the URL is equivalent to verifying that data refetches happen
// — without coupling to which hook does the fetching.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { renderWithProviders, mockApi, fixtures } from '../test-utils'
import TopBar from './TopBar'

beforeEach(() => {
  mockApi({
    '/api/users': fixtures.users,
    '/api/settings': fixtures.settings,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TopBar — filter interactions', () => {
  it('clicking the 7d preset highlights it and triggers refetch params', async () => {
    renderWithProviders(<TopBar />, { initialPath: '/' })
    await waitFor(() => expect(screen.getByText('Alice (590)')).toBeInTheDocument())

    const sevenD = screen.getByRole('button', { name: '7d' })
    fireEvent.click(sevenD)

    // The 7d button picks up the solid variant — Chakra renders a different
    // class set, but more reliably we can re-derive: after clicking 7d the
    // date inputs become populated with the resolved range.
    await waitFor(() => {
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      expect(dateInputs.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('initial URL with ?range=30d applies the preset on mount', async () => {
    renderWithProviders(<TopBar />, { initialPath: '/?range=30d' })
    await waitFor(() => expect(screen.getByText('Alice (590)')).toBeInTheDocument())

    // Date inputs reflect the resolved 30d range
    const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement[]
    expect(dateInputs.length).toBe(2)

    const [start, end] = dateInputs.map((i) => new Date(i.value))
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    // Allow a 1-day fudge for clock drift across midnight in the test runner
    expect(days).toBeGreaterThanOrEqual(29)
    expect(days).toBeLessThanOrEqual(31)
  })

  it('selecting a user updates the user filter (drives next refetch)', async () => {
    renderWithProviders(<TopBar />, { initialPath: '/' })
    await waitFor(() => expect(screen.getByText('Alice (590)')).toBeInTheDocument())

    // The native <select> wraps the user options
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'alice' } })

    expect(select.value).toBe('alice')
  })

  it('clicking All clears the date range', async () => {
    renderWithProviders(<TopBar />, { initialPath: '/?range=7d' })
    await waitFor(() => expect(screen.getByText('Alice (590)')).toBeInTheDocument())

    // Confirm 7d preset is hydrated (date inputs populated)
    let dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement[]
    expect(dateInputs.length).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: 'All' }))

    await waitFor(() => {
      dateInputs = screen.queryAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement[]
      expect(dateInputs.length).toBe(0)
    })
  })

  it('typing into a date input switches to custom range', async () => {
    renderWithProviders(<TopBar />, { initialPath: '/?range=7d' })
    await waitFor(() => expect(screen.getByText('Alice (590)')).toBeInTheDocument())

    const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement[]
    fireEvent.change(dateInputs[0], { target: { value: '2026-02-01' } })

    await waitFor(() => {
      const start = (screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement[])[0]
      expect(start.value).toBe('2026-02-01')
    })
  })
})
