import { FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCachedSearchByTerm, searchByTerm } from '../api/client'
import type { PodcastFeed } from '../api/types'
import PodcastCard from '../components/PodcastCard'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const [input, setInput] = useState(query)
  const [results, setResults] = useState<PodcastFeed[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const nextQuery = params.get('q') || ''
    setInput(nextQuery)

    if (!nextQuery.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    const cached = getCachedSearchByTerm(nextQuery, 40)
    if (cached) {
      setResults(cached.feeds || [])
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(null)

    searchByTerm(nextQuery, 40, cached ? { forceRefresh: true } : undefined)
      .then((data) => {
        if (cancelled) return
        setResults(data.feeds || [])
        setError(null)
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setError(err instanceof Error ? err.message : 'Search failed')
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
        <p className="studio-eyebrow">Search the archive</p>
        <h1 className="studio-title mt-2 text-5xl leading-none sm:text-6xl">Find your next drill</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Search by topic, show name, accent, or learning goal. Pick an episode, then work line-by-line in the studio deck.
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-950/45 p-2 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Try: pronunciation, science, business, news…"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300 focus:ring-2 focus:ring-aurora-300/20"
          />
          <button className="studio-button-primary">Search</button>
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
        <p className="text-sm text-slate-400">Refreshing cached results…</p>
      )}

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}

      {!error && query && results.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-slate-400">
            {results.length} results for <span className="text-ember-200">“{query}”</span>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((podcast) => <PodcastCard key={podcast.id} podcast={podcast} />)}
          </div>
        </div>
      )}

      {!loading && !error && query && results.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm text-slate-300">
          No results for <span className="font-medium text-ember-200">“{query}”</span>
        </p>
      )}
    </div>
  )
}
