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
      const merged = { ...filters, ...extraParams } as Filters & Record<string, unknown>
      const result = await fetcher(merged as any)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [paramsKey])

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

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
