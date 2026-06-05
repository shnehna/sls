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
    <div className="space-y-6 pb-24">
      <section className="studio-panel p-5 sm:p-6">
        <p className="studio-eyebrow">Search</p>
        <h1 className="studio-title mt-2 text-3xl">Find a podcast</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Search by topic, show name, accent, or learning goal.
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Try: pronunciation, science, business, news…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button className="studio-button-primary">Search</button>
        </form>
      </section>

      {loading && results.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      )}

      {loading && results.length > 0 && (
        <p className="text-sm text-slate-500">Refreshing cached results…</p>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!error && query && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {results.length} results for <span className="font-medium text-slate-950">“{query}”</span>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((podcast) => <PodcastCard key={podcast.id} podcast={podcast} />)}
          </div>
        </div>
      )}

      {!loading && !error && query && results.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No results for <span className="font-medium text-slate-950">“{query}”</span>
        </p>
      )}
    </div>
  )
}
