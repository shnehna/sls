import { useState, useEffect, useCallback } from 'react'
import { getCachedEpisodesByFeedId, getEpisodesByFeedId } from '../api/client'
import type { Episode } from '../api/types'

export function useEpisodes(feedId: number | null) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!feedId) return

    const options = { max: 50, fulltext: true }
    const cached = getCachedEpisodesByFeedId(feedId, options)

    if (cached) {
      setEpisodes(cached.items || [])
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await getEpisodesByFeedId(
        feedId,
        options,
        forceRefresh || cached ? { forceRefresh: true } : undefined
      )
      setEpisodes(data.items || [])
      setError(null)
    } catch (err) {
      if (!cached) {
        setError(err instanceof Error ? err.message : 'Failed to load episodes')
      }
    } finally {
      setLoading(false)
    }
  }, [feedId])

  useEffect(() => {
    let active = true
    fetch().finally(() => {
      if (!active) return
    })
    return () => {
      active = false
    }
  }, [fetch])

  return { episodes, loading, error, refetch: () => fetch(true) }
}
