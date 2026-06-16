import type {
  SearchResponse,
  TrendingPodcastsResponse,
  CategoryListResponse,
  PodcastResponse,
  EpisodesResponse,
  EpisodeResponse,
  RecentDataResponse,
  RecentFeedsResponse,
  EpisodeTranscriptResponse,
  TranscriptCue,
  TranscriptFileType,
  TranscriptJob,
} from './types'

const BASE_URL = '/api/podcastindex'
const CACHE_PREFIX = 'shadowcast-cache-v1'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

const CACHE_TTL = {
  recent: 30 * MINUTE,
  categories: 24 * HOUR,
  trending: 30 * MINUTE,
  search: 10 * MINUTE,
  podcast: 24 * HOUR,
  episodes: 12 * HOUR,
  episode: 24 * HOUR,
  transcript: 24 * HOUR,
  storedTranscript: 5 * MINUTE,
}

interface CacheEntry<T> {
  timestamp: number
  data: T
}

interface CacheOptions {
  forceRefresh?: boolean
}

interface TrendingOptions {
  max?: number
  since?: number
  lang?: string
  cat?: string
  notcat?: string
}

function buildApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
  }
  return url.toString()
}

function cacheKey(value: string): string {
  return `${CACHE_PREFIX}:${value}`
}

function readCachedValue<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(key))
    if (!raw) return null

    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (!parsed || typeof parsed.timestamp !== 'number' || !('data' in parsed)) {
      window.localStorage.removeItem(cacheKey(key))
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeCachedValue<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(
      cacheKey(key),
      JSON.stringify({ timestamp: Date.now(), data } satisfies CacheEntry<T>)
    )
  } catch {
    // localStorage may be unavailable, full, or blocked. Network data still works.
  }
}

function getCachedValue<T>(key: string, maxAge = Number.POSITIVE_INFINITY): T | null {
  const cached = readCachedValue<T>(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > maxAge) return null
  return cached.data
}

async function fetchWithCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cached = readCachedValue<T>(key)
  const isFresh = cached ? Date.now() - cached.timestamp <= ttl : false

  if (cached && isFresh && !options?.forceRefresh) {
    return cached.data
  }

  try {
    const data = await fetcher()
    writeCachedValue(key, data)
    return data
  } catch (error) {
    if (cached) return cached.data
    throw error
  }
}

async function fetchApi<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const response = await fetch(buildApiUrl(path, params))
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (data.status === 'false') {
    throw new Error(data.description || 'Unknown API error')
  }
  return data as T
}

function apiCacheKey(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  return buildApiUrl(path, params)
}

function transcriptCacheKey(url: string): string {
  return `transcript:${url}`
}

// ==================== Search ====================

export function getCachedSearchByTerm(query: string, max = 20): SearchResponse | null {
  return getCachedValue<SearchResponse>(
    apiCacheKey('/search/byterm', { q: query, max, similar: true })
  )
}

export async function searchByTerm(
  query: string,
  max = 20,
  options?: CacheOptions
): Promise<SearchResponse> {
  const params = { q: query, max, similar: true }
  return fetchWithCache(
    apiCacheKey('/search/byterm', params),
    CACHE_TTL.search,
    () => fetchApi<SearchResponse>('/search/byterm', params),
    options
  )
}

// ==================== Categories ====================

export function getCachedCategoryList(): CategoryListResponse | null {
  return getCachedValue<CategoryListResponse>(apiCacheKey('/categories/list'))
}

export async function getCategoryList(options?: CacheOptions): Promise<CategoryListResponse> {
  return fetchWithCache(
    apiCacheKey('/categories/list'),
    CACHE_TTL.categories,
    () => fetchApi<CategoryListResponse>('/categories/list'),
    options
  )
}

// ==================== Trending Podcasts ====================

function trendingParams(opts?: TrendingOptions): Record<string, string | number | boolean | undefined> {
  return {
    max: opts?.max ?? 50,
    since: opts?.since,
    lang: opts?.lang ?? 'en',
    cat: opts?.cat,
    notcat: opts?.notcat,
  }
}

export function getCachedTrendingPodcasts(opts?: TrendingOptions): TrendingPodcastsResponse | null {
  const params = trendingParams(opts)
  return getCachedValue<TrendingPodcastsResponse>(apiCacheKey('/podcasts/trending', params))
}

export async function getTrendingPodcasts(
  opts?: TrendingOptions,
  options?: CacheOptions
): Promise<TrendingPodcastsResponse> {
  const params = trendingParams(opts)
  return fetchWithCache(
    apiCacheKey('/podcasts/trending', params),
    CACHE_TTL.trending,
    () => fetchApi<TrendingPodcastsResponse>('/podcasts/trending', params),
    options
  )
}

// ==================== Podcasts ====================

export function getCachedPodcastByFeedId(id: number): PodcastResponse | null {
  return getCachedValue<PodcastResponse>(apiCacheKey('/podcasts/byfeedid', { id }))
}

export async function getPodcastByFeedId(
  id: number,
  options?: CacheOptions
): Promise<PodcastResponse> {
  return fetchWithCache(
    apiCacheKey('/podcasts/byfeedid', { id }),
    CACHE_TTL.podcast,
    () => fetchApi<PodcastResponse>('/podcasts/byfeedid', { id }),
    options
  )
}

// ==================== Episodes ====================

function episodeListParams(
  id: number,
  opts?: { max?: number; since?: number; fulltext?: boolean }
): Record<string, string | number | boolean | undefined> {
  return {
    id: String(id),
    max: opts?.max ?? 50,
    since: opts?.since,
    fulltext: opts?.fulltext ? true : undefined,
  }
}

export function getCachedEpisodesByFeedId(
  id: number,
  opts?: { max?: number; since?: number; fulltext?: boolean }
): EpisodesResponse | null {
  const params = episodeListParams(id, opts)
  return getCachedValue<EpisodesResponse>(apiCacheKey('/episodes/byfeedid', params))
}

export async function getEpisodesByFeedId(
  id: number,
  opts?: { max?: number; since?: number; fulltext?: boolean },
  options?: CacheOptions
): Promise<EpisodesResponse> {
  const params = episodeListParams(id, opts)
  return fetchWithCache(
    apiCacheKey('/episodes/byfeedid', params),
    CACHE_TTL.episodes,
    () => fetchApi<EpisodesResponse>('/episodes/byfeedid', params),
    options
  )
}

export function getCachedEpisodeById(id: number): EpisodeResponse | null {
  return getCachedValue<EpisodeResponse>(apiCacheKey('/episodes/byid', { id, fulltext: true }))
}

export async function getEpisodeById(
  id: number,
  options?: CacheOptions
): Promise<EpisodeResponse> {
  const params = { id, fulltext: true }
  return fetchWithCache(
    apiCacheKey('/episodes/byid', params),
    CACHE_TTL.episode,
    () => fetchApi<EpisodeResponse>('/episodes/byid', params),
    options
  )
}

// ==================== Recent ====================

export function getCachedRecentData(max = 20, since?: number): RecentDataResponse | null {
  return getCachedValue<RecentDataResponse>(apiCacheKey('/recent/data', { max, since }))
}

export async function getRecentData(
  max = 20,
  since?: number,
  options?: CacheOptions
): Promise<RecentDataResponse> {
  const params = { max, since }
  return fetchWithCache(
    apiCacheKey('/recent/data', params),
    CACHE_TTL.recent,
    () => fetchApi<RecentDataResponse>('/recent/data', params),
    options
  )
}

export function getCachedRecentFeeds(
  max = 50,
  since?: number,
  lang = 'en'
): RecentFeedsResponse | null {
  return getCachedValue<RecentFeedsResponse>(apiCacheKey('/recent/feeds', { max, since, lang }))
}

export async function getRecentFeeds(
  max = 50,
  since?: number,
  lang = 'en',
  options?: CacheOptions
): Promise<RecentFeedsResponse> {
  const params = { max, since, lang }
  return fetchWithCache(
    apiCacheKey('/recent/feeds', params),
    CACHE_TTL.recent,
    () => fetchApi<RecentFeedsResponse>('/recent/feeds', params),
    options
  )
}

// ==================== Transcript ====================

export function getCachedTranscriptFile(url: string): string | null {
  return getCachedValue<string>(transcriptCacheKey(url))
}

export async function fetchTranscriptFile(url: string, options?: CacheOptions): Promise<string> {
  return fetchWithCache(
    transcriptCacheKey(url),
    CACHE_TTL.transcript,
    async () => {
      const proxiedUrl = new URL('/api/transcript', window.location.origin)
      proxiedUrl.searchParams.set('url', url)

      const response = await fetch(proxiedUrl.toString())
      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`)
      }
      return response.text()
    },
    options
  )
}


// ==================== Stored Transcripts ====================

function storedTranscriptCacheKey(episodeId: number): string {
  return `stored-transcript:${episodeId}`
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const data = await response.json() as { error?: string }
      if (data.error) message = data.error
    } catch {
      // Keep HTTP status message when the response is not JSON.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export function getCachedEpisodeTranscript(episodeId: number): EpisodeTranscriptResponse | null {
  return getCachedValue<EpisodeTranscriptResponse>(storedTranscriptCacheKey(episodeId), CACHE_TTL.storedTranscript)
}

export async function getEpisodeTranscript(
  episodeId: number,
  options?: CacheOptions
): Promise<EpisodeTranscriptResponse> {
  return fetchWithCache(
    storedTranscriptCacheKey(episodeId),
    CACHE_TTL.storedTranscript,
    async () => {
      const data = await fetchJson<EpisodeTranscriptResponse>(`/api/episodes/${episodeId}/transcript`)
      if (data.status !== 'ready') {
        writeCachedValue(storedTranscriptCacheKey(episodeId), data)
      }
      return data
    },
    options
  )
}

export interface ImportEpisodeTranscriptPayload {
  url: string
  type: TranscriptFileType
  audioUrl: string
  episodeGuid?: string
  provider?: string
  sourceKind?: 'podcast_index_remote' | 'imported_remote'
  language?: string
}

export async function importEpisodeTranscript(
  episodeId: number,
  payload: ImportEpisodeTranscriptPayload
): Promise<{ ok: true; transcriptId: string; cueCount: number }> {
  const result = await fetchJson<{ ok: true; transcriptId: string; cueCount: number }>(
    `/api/episodes/${episodeId}/transcript/import`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )
  window.localStorage.removeItem(cacheKey(storedTranscriptCacheKey(episodeId)))
  return result
}

export interface CreateTranscriptionJobPayload {
  audioUrl: string
  episodeGuid?: string
  provider?: string
  language?: string
}

export async function createTranscriptionJob(
  episodeId: number,
  payload: CreateTranscriptionJobPayload
): Promise<{ job: TranscriptJob }> {
  const result = await fetchJson<{ job: TranscriptJob }>(`/api/episodes/${episodeId}/transcription-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  window.localStorage.removeItem(cacheKey(storedTranscriptCacheKey(episodeId)))
  return result
}

export async function getTranscriptionJob(jobId: string): Promise<{ job: TranscriptJob }> {
  return fetchJson<{ job: TranscriptJob }>(`/api/transcription-jobs/${jobId}`)
}

export async function completeTranscriptionJob(
  jobId: string,
  payload: { cues?: Array<Partial<TranscriptCue>>; raw?: string; type?: TranscriptFileType; format?: TranscriptFileType | 'normalized'; language?: string }
): Promise<{ ok: true; job: TranscriptJob; cueCount: number }> {
  return fetchJson<{ ok: true; job: TranscriptJob; cueCount: number }>(
    `/api/transcription-jobs/${jobId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )
}
