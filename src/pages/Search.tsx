import { FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCachedSearchByTerm, searchByTerm } from '../api/client'
import { getPodcastSaveCounts } from '../api/library'
import type { PodcastFeed } from '../api/types'
import PodcastCard from '../components/PodcastCard'
import { filterEnglishPodcasts, podcastSearchText } from '../utils/podcast'

type SaveCountMap = Record<number, number>

function textMatchScore(podcast: PodcastFeed, query: string): number {
  const text = podcastSearchText(podcast)
  const title = podcast.title.toLowerCase()
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0

  return tokens.reduce((score, token) => {
    if (title.includes(token)) score += 24
    if (text.includes(token)) score += 8
    return score
  }, 0)
}

function saveCountBoost(saveCount: number): number {
  return Math.log10(saveCount + 1) * 12
}

function rankSearchResults(podcasts: PodcastFeed[], query: string, saveCounts: SaveCountMap): PodcastFeed[] {
  return podcasts
    .map((podcast, index) => ({
      podcast,
      score: textMatchScore(podcast, query) + saveCountBoost(saveCounts[podcast.id] || 0) - index * 0.01,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ podcast }) => podcast)
}

async function loadSaveCounts(podcasts: PodcastFeed[]): Promise<SaveCountMap> {
  try {
    const { counts } = await getPodcastSaveCounts(podcasts.map((podcast) => podcast.id))
    return Object.fromEntries(podcasts.map((podcast) => [podcast.id, counts[String(podcast.id)] || 0]))
  } catch {
    return Object.fromEntries(podcasts.map((podcast) => [podcast.id, 0]))
  }
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const [input, setInput] = useState(query)
  const [results, setResults] = useState<PodcastFeed[]>([])
  const [saveCounts, setSaveCounts] = useState<SaveCountMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const nextQuery = params.get('q') || ''
    setInput(nextQuery)

    if (!nextQuery.trim()) {
      setResults([])
      setSaveCounts({})
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    const cached = getCachedSearchByTerm(nextQuery, 80)
    if (cached) {
      const cachedEnglish = filterEnglishPodcasts(cached.feeds || [])
      setResults(cachedEnglish.slice(0, 40))
      setLoading(false)
      loadSaveCounts(cachedEnglish).then((counts) => {
        if (cancelled) return
        setSaveCounts(counts)
        setResults(rankSearchResults(cachedEnglish, nextQuery, counts).slice(0, 40))
      })
    } else {
      setLoading(true)
    }
    setError(null)

    searchByTerm(nextQuery, 80, cached ? { forceRefresh: true } : undefined)
      .then(async (data) => {
        if (cancelled) return
        const englishFeeds = filterEnglishPodcasts(data.feeds || [])
        const counts = await loadSaveCounts(englishFeeds)
        if (cancelled) return
        setSaveCounts(counts)
        setResults(rankSearchResults(englishFeeds, nextQuery, counts).slice(0, 40))
        setError(null)
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setError(err instanceof Error ? err.message : '搜索失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [params])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (input.trim()) setParams({ q: input.trim() })
  }

  return (
    <div className="space-y-7 pb-28">
      <section className="studio-panel p-6 sm:p-8">
        <p className="studio-eyebrow">搜索播客库</p>
        <h1 className="studio-title mt-2 text-5xl leading-none sm:text-6xl">找到下一段练习材料</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          可以按主题、节目名、口音或练习目标搜索。选择一集后，在工作台里逐句跟读。
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-950/45 p-2 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="试试：pronunciation、science、business、news..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-ember-300 focus:ring-2 focus:ring-ember-300/20"
          />
          <button className="studio-button-primary">搜索</button>
        </form>
      </section>

      {loading && results.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-studio border border-white/10 bg-white/[.06]" />
          ))}
        </div>
      )}

      {loading && results.length > 0 && (
        <p className="text-sm text-slate-400">正在刷新缓存结果...</p>
      )}

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}

      {!error && query && results.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-slate-400">
            “{query}” 的 {results.length} 个结果
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((podcast) => (
              <PodcastCard
                key={podcast.id}
                podcast={podcast}
                saveCount={saveCounts[podcast.id] || 0}
                onSaveCountChange={(podcastId, updater) => {
                  setSaveCounts((current) => ({
                    ...current,
                    [podcastId]: Math.max(0, updater(current[podcastId] || 0)),
                  }))
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && !error && query && results.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm text-slate-300">
          没有找到 <span className="font-medium text-ember-200">“{query}”</span> 的结果
        </p>
      )}
    </div>
  )
}
