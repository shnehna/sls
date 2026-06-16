import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import * as libraryApi from '../api/library'
import type { LibrarySummary, SavePodcastInput, SavedPodcastItem } from '../api/library'

interface LibraryContextValue {
  library: LibrarySummary | null
  savedPodcasts: SavedPodcastItem[]
  savedPodcastIds: Set<number>
  loading: boolean
  error: string | null
  refreshLibrary: () => Promise<void>
  savePodcast: (input: SavePodcastInput) => Promise<void>
  removeSavedPodcast: (podcastId: number) => Promise<void>
  isSavedPodcast: (podcastId: number) => boolean
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [library, setLibrary] = useState<LibrarySummary | null>(null)
  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcastItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshLibrary = useCallback(async () => {
    if (!user) {
      setLibrary(null)
      setSavedPodcasts([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const nextLibrary = await libraryApi.getLibrary()
      setLibrary(nextLibrary)
      setSavedPodcasts(nextLibrary.savedPodcasts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载资料库失败')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  const savePodcast = useCallback(async (input: SavePodcastInput) => {
    if (!user) return
    const result = await libraryApi.savePodcast(input)
    setSavedPodcasts((items) => {
      const rest = items.filter((item) => item.podcastId !== result.podcast.podcastId)
      return [result.podcast, ...rest]
    })
    void refreshLibrary()
  }, [refreshLibrary, user])

  const removeSavedPodcast = useCallback(async (podcastId: number) => {
    if (!user) return
    await libraryApi.removeSavedPodcast(podcastId)
    setSavedPodcasts((items) => items.filter((item) => item.podcastId !== podcastId))
    void refreshLibrary()
  }, [refreshLibrary, user])

  const savedPodcastIds = useMemo(() => new Set(savedPodcasts.map((podcast) => podcast.podcastId)), [savedPodcasts])
  const isSavedPodcast = useCallback((podcastId: number) => savedPodcastIds.has(podcastId), [savedPodcastIds])

  const value = useMemo<LibraryContextValue>(() => ({
    library,
    savedPodcasts,
    savedPodcastIds,
    loading,
    error,
    refreshLibrary,
    savePodcast,
    removeSavedPodcast,
    isSavedPodcast,
  }), [library, savedPodcasts, savedPodcastIds, loading, error, refreshLibrary, savePodcast, removeSavedPodcast, isSavedPodcast])

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext)
  if (!context) throw new Error('useLibrary must be used within LibraryProvider')
  return context
}
