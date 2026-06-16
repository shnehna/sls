import { useEffect, useMemo, useState } from 'react'
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

const sceneAccents = [
  'border-l-ember-300/80 bg-ember-300/10 text-ember-100',
  'border-l-sky-300/80 bg-sky-300/10 text-sky-100',
  'border-l-emerald-300/80 bg-emerald-300/10 text-emerald-100',
  'border-l-rose-300/80 bg-rose-300/10 text-rose-100',
  'border-l-violet-300/80 bg-violet-300/10 text-violet-100',
  'border-l-cyan-300/80 bg-cyan-300/10 text-cyan-100',
  'border-l-lime-300/80 bg-lime-300/10 text-lime-100',
]

const topicAccents = [
  'hover:border-ember-300/40 hover:bg-ember-300/10 hover:text-ember-100',
  'hover:border-sky-300/40 hover:bg-sky-300/10 hover:text-sky-100',
  'hover:border-emerald-300/40 hover:bg-emerald-300/10 hover:text-emerald-100',
  'hover:border-rose-300/40 hover:bg-rose-300/10 hover:text-rose-100',
  'hover:border-violet-300/40 hover:bg-violet-300/10 hover:text-violet-100',
  'hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100',
]

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
  const [activeCategoryId, setActiveCategoryId] = useState(learningCategories[0]?.id || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const podcastIds = Object.values(categoryResults).flat().map((podcast) => podcast.id)
  const { counts: saveCounts, setPodcastSaveCount } = usePodcastSaveCounts(podcastIds)
  const activeCategory = useMemo<LearningCategory>(
    () => learningCategories.find((category) => category.id === activeCategoryId) || learningCategories[0]!,
    [activeCategoryId]
  )

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
        setError(hadRequestError && loadedCount === 0 ? '暂时无法加载练习分类' : null)
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
            <p className="studio-eyebrow">英语练习场景</p>
            <h1 className="studio-title mt-4 text-5xl leading-[.93] sm:text-7xl">
              {user ? `欢迎回来，${user.displayName}` : '先选一个场景，再开始跟读。'}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              {user
                ? '继续你的英语跟读练习，或者选择今天最想提升的表达场景。'
                : '按真实使用场景发现英文播客：日常对话、职场、故事、新闻、发音和轻松泛听。'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search?q=conversation" className="studio-button-primary">从日常对话开始</Link>
              <Link to={user ? '/library' : '/search?q=pronunciation'} className="studio-button-ghost">{user ? '打开资料库' : '练习发音'}</Link>
            </div>
          </div>

          <div className="relative min-h-72 overflow-hidden rounded-deck border border-white/10 bg-ink-950/45 p-5 shadow-glow">
            <div className="absolute inset-0 waveform-strip opacity-40" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[.18em] text-slate-400">
                <span>{user ? '你的工作台' : '练习控制台'}</span>
                <span className="text-ember-300">按场景练习</span>
              </div>
              <div className="mt-14 space-y-3">
                {(user ? ['继续练习', '收藏播客', '最近书签'] : ['日常表达', '职场英语', '故事和观点']).map((label, index) => (
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

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">练习场景</p>
            <h2 className="studio-title mt-1 text-3xl">选择你真正需要的英语</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            按你今天想练的声音、节奏和词汇来选择，而不是为了学英语而学英语。
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
          <div className="grid gap-2 sm:grid-cols-2">
            {learningCategories.map((category, index) => {
              const isActive = category.id === activeCategory.id
              const accent = sceneAccents[index % sceneAccents.length]

              return (
                <Link
                  key={category.id}
                  to={`/search?q=${encodeURIComponent(category.query)}`}
                  onMouseEnter={() => setActiveCategoryId(category.id)}
                  onFocus={() => setActiveCategoryId(category.id)}
                  className={`group flex min-h-[92px] items-center gap-3 rounded-xl border border-l-4 border-white/10 bg-white/[.045] p-3.5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.075] ${
                    isActive ? `${accent} border-white/20 shadow-panel` : 'border-l-white/20'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-sm font-bold ${
                    isActive ? 'border-current/30 bg-white/10' : 'border-white/10 bg-white/[.055] text-slate-300'
                  }`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-50 group-hover:text-white">{category.title}</span>
                    <span className="mt-1 block truncate text-xs leading-5 text-slate-400">{category.focus}</span>
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.045] p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-ember-200">{activeCategory.label}</p>
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-white">{activeCategory.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{activeCategory.description}</p>
            <div className="mt-5 rounded-xl border border-white/10 bg-ink-950/30 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">适合练习</p>
              <p className="mt-1 text-sm text-slate-200">{activeCategory.focus}</p>
            </div>
            <Link to={`/search?q=${encodeURIComponent(activeCategory.query)}`} className="studio-button-primary mt-5 w-full">
              开始练习
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">生活话题</p>
            <h2 className="studio-title mt-1 text-3xl">直接进入真实生活主题</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            来自 PodcastIndex 分类的快捷入口，点击后会进入只保留英文资源的主题搜索。
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {lifeTopics.map((topic, index) => (
            <Link
              key={topic.name}
              to={`/search?q=${encodeURIComponent(topic.name.toLowerCase())}`}
              title={topic.description}
              className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 ${topicAccents[index % topicAccents.length]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span>{topic.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {user && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">继续收听</p>
              <h2 className="studio-title mt-1 text-3xl">接着上次的练习</h2>
            </div>
            <Link to="/library/progress" className="text-sm font-semibold text-aurora-200 hover:text-ember-200">查看进度 →</Link>
          </div>
          <ContinueListening items={library?.recentProgress || []} loading={libraryLoading} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">跟读推荐</p>
            <h2 className="studio-title mt-1 text-3xl">按练习适配度推荐，而不是只追最新</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            每一组都从练习目标出发，结合英文趋势播客和主题搜索，再按跟读适配度排序。
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
            {category.description} 适合练习：{category.focus}。
          </p>
        </div>
        <Link to={`/search?q=${encodeURIComponent(category.query)}`} className="text-sm font-semibold text-aurora-200 hover:text-ember-200">
          查看这个场景 -&gt;
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
          暂时没有加载到足够匹配的播客。你可以打开这个场景搜索查看更多结果。
        </div>
      )}
    </section>
  )
}
