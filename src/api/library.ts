export interface SavedPodcastItem {
  id: string
  podcastId: number
  title?: string
  image?: string
  url?: string
  author?: string
  createdAt: string
  updatedAt: string
}

export interface EpisodeProgressItem {
  id: string
  episodeId: number
  podcastId?: number
  positionSeconds: number
  durationSeconds?: number
  completedAt?: string
  episodeTitle?: string
  episodeImage?: string
  podcastTitle?: string
  podcastImage?: string
  createdAt: string
  updatedAt: string
}

export interface TranscriptBookmarkItem {
  id: string
  episodeId: number
  transcriptId?: string
  cueIndex?: number
  note?: string
  cueText?: string
  cueStartTime?: number
  cueEndTime?: number
  episodeTitle?: string
  podcastTitle?: string
  createdAt: string
  updatedAt: string
}

export interface LibrarySummary {
  savedPodcasts: SavedPodcastItem[]
  recentProgress: EpisodeProgressItem[]
  recentBookmarks: TranscriptBookmarkItem[]
  stats: {
    savedPodcastCount: number
    inProgressEpisodeCount: number
    bookmarkCount: number
    lastPracticeAt?: string
  }
}

export interface SavePodcastInput {
  podcastId: number
  title?: string
  image?: string
  url?: string
  author?: string
}

export interface ProgressInput {
  podcastId?: number
  positionSeconds: number
  durationSeconds?: number
  episodeTitle?: string
  episodeImage?: string
  podcastTitle?: string
  podcastImage?: string
}

export interface BookmarkInput {
  episodeId: number
  transcriptId?: string
  cueIndex?: number
  note?: string
  cueText?: string
  cueStartTime?: number
  cueEndTime?: number
  episodeTitle?: string
  podcastTitle?: string
}

async function fetchLibraryJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

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

export function getLibrary(): Promise<LibrarySummary> {
  return fetchLibraryJson<LibrarySummary>('/api/me/library')
}

export function getSavedPodcasts(): Promise<{ podcasts: SavedPodcastItem[] }> {
  return fetchLibraryJson<{ podcasts: SavedPodcastItem[] }>('/api/me/saved-podcasts')
}

export function savePodcast(input: SavePodcastInput): Promise<{ podcast: SavedPodcastItem }> {
  return fetchLibraryJson<{ podcast: SavedPodcastItem }>('/api/me/saved-podcasts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function removeSavedPodcast(podcastId: number): Promise<{ ok: true }> {
  return fetchLibraryJson<{ ok: true }>(`/api/me/saved-podcasts/${podcastId}`, { method: 'DELETE' })
}

export function getEpisodeProgressList(): Promise<{ progress: EpisodeProgressItem[] }> {
  return fetchLibraryJson<{ progress: EpisodeProgressItem[] }>('/api/me/episode-progress')
}

export function getEpisodeProgress(episodeId: number): Promise<{ progress: EpisodeProgressItem | null }> {
  return fetchLibraryJson<{ progress: EpisodeProgressItem | null }>(`/api/me/episode-progress/${episodeId}`)
}

export function saveEpisodeProgress(episodeId: number, input: ProgressInput): Promise<{ progress: EpisodeProgressItem }> {
  return fetchLibraryJson<{ progress: EpisodeProgressItem }>(`/api/me/episode-progress/${episodeId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function getTranscriptBookmarks(): Promise<{ bookmarks: TranscriptBookmarkItem[] }> {
  return fetchLibraryJson<{ bookmarks: TranscriptBookmarkItem[] }>('/api/me/transcript-bookmarks')
}

export function createTranscriptBookmark(input: BookmarkInput): Promise<{ bookmark: TranscriptBookmarkItem }> {
  return fetchLibraryJson<{ bookmark: TranscriptBookmarkItem }>('/api/me/transcript-bookmarks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteTranscriptBookmark(bookmarkId: string): Promise<{ ok: true }> {
  return fetchLibraryJson<{ ok: true }>(`/api/me/transcript-bookmarks/${bookmarkId}`, { method: 'DELETE' })
}
