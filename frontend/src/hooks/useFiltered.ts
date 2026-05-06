// frontend/src/hooks/useFiltered.ts
//
// Drop-in replacement for the previous useApi hook. Returns the same
// { data, loading, error, refetch } shape so pages migrate with minimal
// diff — the work happens inside, where useQuery handles dedup,
// cancellation, and stale-data semantics natively (no useEffect
// calling setState, so no react-hooks/set-state-in-effect lint disable).

import { useQuery } from '@tanstack/react-query'
import { useFilters } from '../context/FilterContext'
import type { Filters } from '../api/client'

interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function toResult<T>(q: ReturnType<typeof useQuery<T>>): QueryResult<T> {
  return {
    data: q.data ?? null,
    loading: q.isPending,
    error: q.error ? (q.error as Error).message : null,
    refetch: () => {
      void q.refetch()
    },
  }
}

/**
 * Filter-aware fetch. Re-runs whenever the filter context or `extraParams`
 * change. The fetcher's name becomes the cache-key root for readable
 * devtools output.
 */
export function useFiltered<T>(
  fetcher: (params: Filters) => Promise<T>,
  extraParams?: Record<string, unknown>,
): QueryResult<T> {
  const { filters } = useFilters()
  const merged = { ...filters, ...(extraParams ?? {}) } as Filters
  return toResult(
    useQuery<T>({
      queryKey: [fetcher.name, merged],
      queryFn: () => fetcher(merged),
    }),
  )
}

/** Filter-independent fetch (e.g. /api/users, /api/sync/status). */
export function useUnfiltered<T>(fetcher: () => Promise<T>): QueryResult<T> {
  return toResult(
    useQuery<T>({
      queryKey: [fetcher.name],
      queryFn: () => fetcher(),
    }),
  )
}
