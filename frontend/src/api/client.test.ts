import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchOverview, fetchTopModels, fetchUsers, validatePath, triggerSync } from './client'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('API client', () => {
  it('fetchOverview sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ total_images: 100, models_used: 5, top_model: 'Test' }),
    })
    const result = await fetchOverview()
    expect(mockFetch).toHaveBeenCalledWith('/api/stats/overview?')
    expect(result.total_images).toBe(100)
  })

  it('fetchOverview passes filters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ total_images: 50 }),
    })
    await fetchOverview({ user_id: 'user-1', start_date: '2026-01-01', end_date: '2026-02-01' })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('user_id=user-1')
    expect(url).toContain('start_date=2026-01-01')
  })

  it('fetchTopModels passes limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ model_name: 'A', count: 10 }]),
    })
    await fetchTopModels({ limit: 5 })
    expect(mockFetch.mock.calls[0][0]).toContain('limit=5')
  })

  it('fetchUsers returns user list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ user_id: 'u1', display_name: 'Alice', image_count: 10 }]),
    })
    const users = await fetchUsers()
    expect(users[0].display_name).toBe('Alice')
  })

  it('validatePath sends POST with path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true, image_count: 100 }),
    })
    await validatePath('/some/path')
    expect(mockFetch).toHaveBeenCalledWith('/api/validate-path', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ path: '/some/path' }),
    }))
  })

  it('triggerSync sends POST with invoke_path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ images_imported: 100 }),
    })
    await triggerSync('/some/path')
    expect(mockFetch).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ invoke_path: '/some/path' }),
    }))
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    await expect(fetchOverview()).rejects.toThrow()
  })
})
