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
      const merged = { ...filters, ...extraParams } as Filters
      const result = await fetcher(merged)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
    // paramsKey JSON-encodes filters + extraParams, so it changes whenever
    // either does. Listing them individually would re-fire on every render
    // because extraParams is usually a fresh object literal at the call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  // eslint-plugin-react-hooks 7.1+ flags this as set-state-in-effect because
  // load() synchronously calls setLoading/setError. The pattern is the
  // standard data-fetching idiom for this app's scale; revisit if/when we
  // migrate to TanStack Query (tracked in an issue).
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
