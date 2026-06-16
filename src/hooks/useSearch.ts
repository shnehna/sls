import { useState, useEffect, useCallback } from 'react'
import { searchByTerm } from '../api/client'
import type { PodcastFeed } from '../api/types'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PodcastFeed[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await searchByTerm(term)
      setResults(data.feeds || [])
    } catch (err) {
        setError(err instanceof Error ? err.message : '搜索失败')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(() => search(query), 400)
    return () => clearTimeout(timer)
  }, [query, search])

  return { query, setQuery, results, loading, error, search }
}
