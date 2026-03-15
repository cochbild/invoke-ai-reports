// frontend/src/context/FilterContext.tsx
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
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
