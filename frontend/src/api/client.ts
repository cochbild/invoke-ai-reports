// frontend/src/api/client.ts

// --- Types ---

export interface Filters {
  user_id?: string
  start_date?: string
  end_date?: string
}

export interface OverviewStats {
  total_images: number
  models_used: number
  top_model: string | null
  first_date: string | null
  last_date: string | null
}

export interface ModelStat {
  model_name: string
  model_base: string | null
  count: number
}

export interface LeaderboardEntry extends ModelStat {
  avg_steps: number | null
  avg_cfg: number | null
  common_resolution: string | null
  first_used: string | null
  last_used: string | null
}

export interface FamilyDist {
  model_base: string
  count: number
}

export interface TokenStat {
  token: string
  count: number
}

export interface LengthBucket {
  bucket: string
  count: number
}

export interface VolumeTrend {
  period: string
  count: number
}

export interface HeatmapCell {
  day_of_week: number
  hour: number
  count: number
}

export interface ParameterTrend {
  period: string
  avg_steps: number | null
  avg_cfg: number | null
}

export interface ResolutionStat {
  resolution: string
  width: number
  height: number
  count: number
}

export interface SchedulerStat {
  scheduler: string
  count: number
}

export interface StepsStat {
  steps: number
  count: number
}

export interface CfgStat {
  cfg_scale: number
  count: number
}

export interface LoraStats {
  total_with_lora: number
  pct_with_lora: number
  top_loras: { lora_name: string; count: number }[]
}

export interface ErrorStats {
  total_items: number
  total_failed: number
  failure_rate: number
  by_error_type: { error_type: string; count: number }[]
  by_model: { model_name: string; count: number }[]
}

export interface UserInfo {
  user_id: string
  display_name: string | null
  image_count: number
}

export interface SyncStatus {
  last_sync: string | null
  source_path: string | null
  images_imported: number | null
  queue_items_imported: number | null
}

export interface SyncResult {
  images_imported: number
  queue_items_imported: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
  image_count?: number
  user_count?: number
  model_count?: number
}

export interface AppSettings {
  invoke_path: string | null
  last_sync: string | null
}

// --- Helpers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }
  const resp = await fetch(`${path}?${searchParams}`)
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  return resp.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  return resp.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`)
  return resp.json()
}

// --- API Functions ---

export const fetchOverview = (f: Filters = {}) =>
  get<OverviewStats>('/api/stats/overview', f)

export const fetchTopModels = (p: Filters & { limit?: number } = {}) =>
  get<ModelStat[]>('/api/stats/models/top', p)

export const fetchLeastModels = (p: Filters & { limit?: number } = {}) =>
  get<ModelStat[]>('/api/stats/models/least', p)

export const fetchFamilyDistribution = (f: Filters = {}) =>
  get<FamilyDist[]>('/api/stats/models/family-distribution', f)

export const fetchLeaderboard = (f: Filters = {}) =>
  get<LeaderboardEntry[]>('/api/stats/models/leaderboard', f)

export const fetchTopTokens = (p: Filters & { limit?: number } = {}) =>
  get<TokenStat[]>('/api/stats/prompts/top-tokens', p)

export const fetchLengthDistribution = (f: Filters = {}) =>
  get<LengthBucket[]>('/api/stats/prompts/length-distribution', f)

export const fetchVolumeTrend = (p: Filters & { granularity?: string } = {}) =>
  get<VolumeTrend[]>('/api/stats/trends/volume', p)

export const fetchHeatmap = (f: Filters = {}) =>
  get<HeatmapCell[]>('/api/stats/trends/heatmap', f)

export const fetchParameterTrends = (p: Filters & { granularity?: string } = {}) =>
  get<ParameterTrend[]>('/api/stats/trends/parameters', p)

export const fetchResolutions = (f: Filters = {}) =>
  get<ResolutionStat[]>('/api/stats/generation/resolutions', f)

export const fetchSchedulers = (f: Filters = {}) =>
  get<SchedulerStat[]>('/api/stats/generation/schedulers', f)

export const fetchSteps = (f: Filters = {}) =>
  get<StepsStat[]>('/api/stats/generation/steps', f)

export const fetchCfg = (f: Filters = {}) =>
  get<CfgStat[]>('/api/stats/generation/cfg', f)

export const fetchLoras = (f: Filters = {}) =>
  get<LoraStats>('/api/stats/generation/loras', f)

export const fetchErrors = (f: Filters = {}) =>
  get<ErrorStats>('/api/stats/generation/errors', f)

export const fetchUsers = () =>
  get<UserInfo[]>('/api/users')

export const fetchSyncStatus = () =>
  get<SyncStatus>('/api/sync/status')

export const triggerSync = (invoke_path: string) =>
  post<SyncResult>('/api/sync', { invoke_path })

export const validatePath = (path: string) =>
  post<ValidationResult>('/api/validate-path', { path })

export const fetchSettings = () =>
  get<AppSettings>('/api/settings')

export const updateSettings = (invoke_path: string) =>
  put<{ invoke_path: string }>('/api/settings', { invoke_path })

export const clearData = () =>
  post<{ status: string }>('/api/settings/clear', {})
