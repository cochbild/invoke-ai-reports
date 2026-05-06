// frontend/src/context/FilterContext.tsx
import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Filters } from '../api/client'

export type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom'

const PRESET_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

interface FilterState {
  filters: Filters
  range: DateRange
  setUserId: (id: string | undefined) => void
  setRange: (range: DateRange) => void
  setCustomDateRange: (start: string | undefined, end: string | undefined) => void
}

const FilterContext = createContext<FilterState | null>(null)

function resolveRange(range: string | null) {
  if (!range || !(range in PRESET_DAYS)) return { start_date: undefined, end_date: undefined }
  const days = PRESET_DAYS[range]
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const userParam = searchParams.get('user') || undefined
  const rangeParam = searchParams.get('range')
  const startParam = searchParams.get('start') || undefined
  const endParam = searchParams.get('end') || undefined

  const range: DateRange =
    rangeParam === '7d' || rangeParam === '30d' || rangeParam === '90d' || rangeParam === 'all'
      ? rangeParam
      : startParam || endParam
        ? 'custom'
        : 'all'

  const filters = useMemo<Filters>(() => {
    if (range === 'custom') {
      return { user_id: userParam, start_date: startParam, end_date: endParam }
    }
    const resolved = resolveRange(range)
    return { user_id: userParam, ...resolved }
  }, [range, userParam, startParam, endParam])

  const update = (changes: Record<string, string | undefined>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v === undefined || v === null || v === '') next.delete(k)
          else next.set(k, v)
        }
        return next
      },
      // Filter changes shouldn't pollute back/forward history.
      { replace: true },
    )
  }

  const setUserId = (id: string | undefined) => update({ user: id })

  const setRange = (r: DateRange) => {
    if (r === 'all') update({ range: undefined, start: undefined, end: undefined })
    else update({ range: r, start: undefined, end: undefined })
  }

  const setCustomDateRange = (start: string | undefined, end: string | undefined) => {
    update({ range: 'custom', start, end })
  }

  return (
    <FilterContext.Provider value={{ filters, range, setUserId, setRange, setCustomDateRange }}>
      {children}
    </FilterContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within FilterProvider')
  return ctx
}
