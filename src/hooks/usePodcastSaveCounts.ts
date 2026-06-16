import { useEffect, useMemo, useState } from 'react'
import { getPodcastSaveCounts } from '../api/library'

export type SaveCountMap = Record<number, number>

export function usePodcastSaveCounts(podcastIds: number[]) {
  const [counts, setCounts] = useState<SaveCountMap>({})

  const uniqueIds = useMemo(() => {
    return Array.from(new Set(podcastIds.filter((id) => Number.isInteger(id) && id > 0))).slice(0, 100)
  }, [podcastIds.join(',')])

  useEffect(() => {
    let cancelled = false
    if (uniqueIds.length === 0) {
      setCounts({})
      return () => {
        cancelled = true
      }
    }

    getPodcastSaveCounts(uniqueIds)
      .then(({ counts: nextCounts }) => {
        if (cancelled) return
        setCounts(Object.fromEntries(uniqueIds.map((id) => [id, nextCounts[String(id)] || 0])))
      })
      .catch(() => {
        if (!cancelled) setCounts(Object.fromEntries(uniqueIds.map((id) => [id, 0])))
      })

    return () => {
      cancelled = true
    }
  }, [uniqueIds.join(',')])

  const setPodcastSaveCount = (podcastId: number, updater: number | ((current: number) => number)) => {
    setCounts((current) => {
      const nextValue = typeof updater === 'function'
        ? updater(current[podcastId] || 0)
        : updater
      return { ...current, [podcastId]: Math.max(0, nextValue) }
    })
  }

  return { counts, setPodcastSaveCount }
}
