// frontend/src/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

// Defaults match the previous useApi behavior: refetch on mount / filter
// change, no stale-while-revalidate, no implicit retries that mask real
// errors during a sync. Tune later if/when needed.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})
