import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCachedCategoryList, getCachedSearchByTerm, getCachedTrendingPodcasts, getCategoryList, getTrendingPodcasts, searchByTerm } from '../api/client'
import type { PodcastFeed } from '../api/types'
import ContinueListening from '../components/ContinueListening'
import PodcastCard from '../components/PodcastCard'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { learningCategories, rankPodcastsForCategory, type LearningCategory } from '../data/learningCategories'
import { lifeTopicCatalog, lifeTopicsFromCategories, type LifeTopic } from '../data/lifeTopics'
import { usePodcastSaveCounts } from '../hooks/usePodcastSaveCounts'

type CategoryResults = Record<string, PodcastFeed[]>

function mergePodcastFeeds(...groups: PodcastFeed[][]): PodcastFeed[] {
  const seen = new Set<number>()
  return groups.flat().filter((podcast) => {
    if (seen.has(podcast.id)) return false
    seen.add(podcast.id)
    return true
  })
}

function trendingOptionsForCategory(category: LearningCategory) {
  return {
    max: 32,
    lang: 'en',
    cat: category.trendingCategories,
    notcat: category.excludedCategories,
  }
}

function cachedCategoryResults(category: LearningCategory): PodcastFeed[] {
  const trending = getCachedTrendingPodcasts(trendingOptionsForCategory(category))?.feeds || []
  const search = getCachedSearchByTerm(category.query, 16)?.feeds || []
  return rankPodcastsForCategory(mergePodcastFeeds(trending, search), category).slice(0, 4)
}

async function loadCategoryResults(category: LearningCategory, cached: PodcastFeed[]): Promise<PodcastFeed[]> {
  let trendingFeeds: PodcastFeed[] = []
  try {
    const trendingOptions = trendingOptionsForCategory(category)
    const trending = await getTrendingPodcasts(
      trendingOptions,
      getCachedTrendingPodcasts(trendingOptions) ? { forceRefresh: true } : undefined
    )
    trendingFeeds = trending.feeds || []
  } catch {
    trendingFeeds = []
  }

  let candidates = rankPodcastsForCategory(mergePodcastFeeds(trendingFeeds, cached), category)

  try {
    const cachedSearch = getCachedSearchByTerm(category.query, 16)
    const search = await searchByTerm(category.query, 16, cachedSearch ? { forceRefresh: true } : undefined)
    candidates = rankPodcastsForCategory(mergePodcastFeeds(candidates, search.feeds || [], cached), category)
  } catch {
    // Trending candidates are still useful when focused search is temporarily unavailable.
  }

  return candidates.slice(0, 4)
}

export default function Home() {
  const { user } = useAuth()
  const { library, loading: libraryLoading } = useLibrary()
  const [categoryResults, setCategoryResults] = useState<CategoryResults>({})
  const [lifeTopics, setLifeTopics] = useState<LifeTopic[]>(lifeTopicCatalog)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const podcastIds = Object.values(categoryResults).flat().map((podcast) => podcast.id)
  const { counts: saveCounts, setPodcastSaveCount } = usePodcastSaveCounts(podcastIds)

  useEffect(() => {
    let cancelled = false
    const cached = getCachedCategoryList()
    if (cached?.feeds) setLifeTopics(lifeTopicsFromCategories(cached.feeds))

    getCategoryList(cached ? { forceRefresh: true } : undefined)
      .then((data) => {
        if (!cancelled && data.feeds) setLifeTopics(lifeTopicsFromCategories(data.feeds))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const cachedResults = learningCategories.reduce<CategoryResults>((results, category) => {
      const podcasts = cachedCategoryResults(category)
      if (podcasts.length > 0) {
        results[category.id] = podcasts
      }
      return results
    }, {})

    if (Object.keys(cachedResults).length > 0) {
      setCategoryResults(cachedResults)
      setLoading(false)
    }

    let hadRequestError = false

    Promise.all(
      learningCategories.map(async (category) => {
        try {
          const podcasts = await loadCategoryResults(category, cachedResults[category.id] || [])
          return [category.id, podcasts] as const
        } catch {
          hadRequestError = true
          return [category.id, cachedResults[category.id] || []] as const
        }
      })
    )
      .then((entries) => {
        if (cancelled) return
        const nextResults = Object.fromEntries(entries)
        setCategoryResults(nextResults)
        const loadedCount = Object.values(nextResults).reduce((count, podcasts) => count + podcasts.length, 0)
        setError(hadRequestError && loadedCount === 0 ? 'Unable to load practice categories' : null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-12 pb-28">
      <section className="studio-panel p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="studio-eyebrow">English practice scenes</p>
            <h1 className="studio-title mt-4 text-5xl leading-[.93] sm:text-7xl">
              {user ? `Welcome back, ${user.displayName}` : 'Choose a scene, then shadow the voices.'}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              {user
                ? 'Continue your English shadowing practice, or pick a scene that matches the way you want to speak today.'
                : 'Find podcasts by real learning situations: daily conversation, work, stories, news, pronunciation, and relaxed listening.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search?q=conversation" className="studio-button-primary">Start with conversation</Link>
              <Link to={user ? '/library' : '/search?q=pronunciation'} className="studio-button-ghost">{user ? 'Open my library' : 'Practice pronunciation'}</Link>
            </div>
          </div>

          <div className="relative min-h-72 overflow-hidden rounded-deck border border-white/10 bg-ink-950/45 p-5 shadow-glow">
            <div className="absolute inset-0 waveform-strip opacity-40" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[.18em] text-slate-400">
                <span>{user ? 'Your studio' : 'Practice console'}</span>
                <span className="text-ember-300">Scene based</span>
              </div>
              <div className="mt-14 space-y-3">
                {(user ? ['Continue practice', 'Saved podcasts', 'Recent bookmarks'] : ['Daily expression', 'Workplace English', 'Stories and ideas']).map((label, index) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[.07] p-4" style={{ transform: `translateX(${index * 18}px)` }}>
                    <span className="font-mono text-[11px] text-aurora-200">0{index + 1}</span>
                    <p className="mt-1 font-display text-2xl font-bold tracking-[-.04em] text-slate-50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}

      <section className="space-y-4">
        <div>
          <p className="studio-eyebrow">Practice scenes</p>
          <h2 className="studio-title mt-1 text-3xl">Pick the English you need</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {learningCategories.map((category) => (
            <Link key={category.id} to={`/search?q=${encodeURIComponent(category.query)}`} className="studio-card block p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-aurora-200">{category.label}</p>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-[-.04em] text-slate-50">{category.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">Life topics</p>
            <h2 className="studio-title mt-1 text-3xl">Browse by what you actually care about</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            These shortcuts come from PodcastIndex categories and open topic searches that still filter results to English feeds.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lifeTopics.map((topic) => (
            <Link key={topic.name} to={`/search?q=${encodeURIComponent(topic.name.toLowerCase())}`} className="studio-card block p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-ember-200">{topic.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{topic.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {user && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">Continue listening</p>
              <h2 className="studio-title mt-1 text-3xl">Resume your latest sessions</h2>
            </div>
            <Link to="/library/progress" className="text-sm font-semibold text-aurora-200 hover:text-ember-200">Open progress →</Link>
          </div>
          <ContinueListening items={library?.recentProgress || []} loading={libraryLoading} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">Recommended for shadowing</p>
            <h2 className="studio-title mt-1 text-3xl">Curated by practice fit, not recency</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Each row starts from a learning goal, combines trending English feeds with focused search, then ranks shows by practice fit.
          </p>
        </div>
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-studio border border-white/10 bg-white/[.06]" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {learningCategories.map((category) => (
              <CategoryShelf
                key={category.id}
                category={category}
                podcasts={categoryResults[category.id] || []}
                saveCounts={saveCounts}
                onSaveCountChange={setPodcastSaveCount}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CategoryShelf({
  category,
  podcasts,
  saveCounts,
  onSaveCountChange,
}: {
  category: LearningCategory
  podcasts: PodcastFeed[]
  saveCounts: Record<number, number>
  onSaveCountChange: (podcastId: number, updater: number | ((current: number) => number)) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="studio-eyebrow">{category.label}</p>
          <h3 className="studio-title mt-1 text-2xl">{category.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {category.description} Best for {category.focus}.
          </p>
        </div>
        <Link to={`/search?q=${encodeURIComponent(category.query)}`} className="text-sm font-semibold text-aurora-200 hover:text-ember-200">
          Explore scene -&gt;
        </Link>
      </div>
      {podcasts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {podcasts.map((podcast) => (
            <PodcastCard
              key={podcast.id}
              podcast={podcast}
              saveCount={saveCounts[podcast.id] || 0}
              onSaveCountChange={onSaveCountChange}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 text-sm leading-6 text-slate-400">
          No strong matches loaded yet. Open the scene search to browse more results.
        </div>
      )}
    </section>
  )
}
