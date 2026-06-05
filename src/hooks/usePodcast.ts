import { useEffect, useState } from 'react'
import { getCachedPodcastByFeedId, getPodcastByFeedId } from '../api/client'
import type { PodcastFeed } from '../api/types'

export function usePodcast(feedId: number | null) {
  const [podcast, setPodcast] = useState<PodcastFeed | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!feedId) return

    let cancelled = false
    const cached = getCachedPodcastByFeedId(feedId)

    if (cached) {
      setPodcast(cached.feed)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(null)

    getPodcastByFeedId(feedId, cached ? { forceRefresh: true } : undefined)
      .then((data) => {
        if (cancelled) return
        setPodcast(data.feed)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setError(err instanceof Error ? err.message : 'Failed to load podcast')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [feedId])

  return { podcast, loading, error }
}
