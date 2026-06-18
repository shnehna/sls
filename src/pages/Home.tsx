import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Play } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { getCachedCategoryList, getCachedSearchByTerm, getCachedTrendingPodcasts, getCategoryList, getTrendingPodcasts, searchByTerm } from '../api/client'
import type { PodcastFeed } from '../api/types'
import ContinueListening from '../components/ContinueListening'
import PodcastCard from '../components/PodcastCard'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { learningCategories, rankPodcastsForCategory, type LearningCategory } from '../data/learningCategories'
import { lifeTopicCatalog, lifeTopicsFromCategories, type LifeTopic } from '../data/lifeTopics'
import { usePodcastSaveCounts } from '../hooks/usePodcastSaveCounts'

gsap.registerPlugin(useGSAP)

type CategoryResults = Record<string, PodcastFeed[]>

const topicAccent = 'hover:border-ember-300/45 hover:bg-ember-300/10 hover:text-amber-100'
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
    candidates = rankPodcastsForCategory(mergePodcastFeeds(candidates, cached), category)
  }

  return candidates.slice(0, 4)
}

export default function Home() {
  const { user } = useAuth()
  const { library, loading: libraryLoading } = useLibrary()
  const rootRef = useRef<HTMLDivElement>(null)
  const [categoryResults, setCategoryResults] = useState<CategoryResults>({})
  const [lifeTopics, setLifeTopics] = useState<LifeTopic[]>(lifeTopicCatalog)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const podcastIds = Object.values(categoryResults).flat().map((podcast) => podcast.id)
  const { counts: saveCounts, setPodcastSaveCount } = usePodcastSaveCounts(podcastIds)
  const heroPodcasts = useMemo(() => mergePodcastFeeds(...Object.values(categoryResults)).slice(0, 3), [categoryResults])
  const firstCategory = learningCategories[0]!

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.from('.home-reveal', {
      y: 22,
      opacity: 0,
      duration: 0.75,
      ease: 'power3.out',
      stagger: 0.08,
    })

  }, { scope: rootRef, dependencies: [loading], revertOnUpdate: true })

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
    <div ref={rootRef} className="w-full max-w-full overflow-x-hidden pb-28">
      <section className="relative overflow-hidden rounded-console border border-white/10 bg-ink-950/45 px-5 py-10 shadow-panel sm:px-8 sm:py-14 lg:min-h-[calc(100dvh-5rem)] lg:px-12 lg:py-20">
        <div className="absolute inset-0 opacity-70">
          <img
            src="https://picsum.photos/seed/podcast-listening-room/1920/1080"
            alt=""
            className="h-full w-full object-cover opacity-24 mix-blend-luminosity contrast-125"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,197,109,.2),transparent_34rem),linear-gradient(110deg,rgba(7,11,18,.96),rgba(7,11,18,.72)_52%,rgba(7,11,18,.94))]" />
        </div>

        <div className="relative grid gap-8 lg:min-h-[34rem] lg:grid-cols-[1fr_.82fr] lg:items-center lg:gap-10">
          <div className="home-reveal max-w-6xl">
            <p className="studio-eyebrow">ShadowCast 英文播客跟读</p>
            <h1 className="studio-title mt-5 max-w-6xl text-[clamp(2.55rem,6vw,5.9rem)] leading-[.95] tracking-[-.045em]">
              把英文播客
              <span
                className="mx-2 hidden h-10 w-24 rounded-full bg-cover bg-center align-middle shadow-ember sm:inline-block sm:h-14 sm:w-36"
                style={{ backgroundImage: 'url(https://picsum.photos/seed/studio-waveform/420/180)' }}
                aria-hidden="true"
              />
              变成跟读工作台
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              按真实场景发现英文节目，边听边看字幕，把句子拆成可以反复练的口语材料。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search?q=conversation" className="studio-button-primary">开始找播客</Link>
              <Link to={user ? '/library' : '/search?q=food'} className="studio-button-ghost">{user ? '回到资料库' : '浏览生活主题'}</Link>
            </div>
          </div>

          <HeroProductPreview podcasts={heroPodcasts} />
        </div>
      </section>

      {error && <div className="mt-8 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}

      <section className="py-16 md:py-28">
        <div className="home-reveal mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">学习路径</p>
            <h2 className="studio-title mt-2 max-w-3xl text-4xl leading-tight sm:text-5xl">先选场景，再进入英文内容</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            首页不再追逐最新更新，而是把真实生活、职场表达、新闻理解和发音练习放在明确入口里。
          </p>
        </div>

        <PracticeBento />
      </section>

      <section className="py-16 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div className="home-reveal lg:sticky lg:top-28">
            <p className="studio-eyebrow">练习场景</p>
            <h2 className="studio-title mt-2 max-w-xl text-4xl leading-tight sm:text-5xl">把选择变成更生活化的入口</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              鼠标悬停时场景会展开，移动端保留清晰的垂直入口。每个入口仍进入英文资源搜索。
            </p>
          </div>

          <SceneAccordion categories={learningCategories} />
        </div>
      </section>

      <section className="space-y-8 py-16 md:py-28">
        <div className="home-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">生活话题</p>
            <h2 className="studio-title mt-2 text-4xl leading-tight sm:text-5xl">直接进入真实生活主题</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            来自 PodcastIndex 分类的快捷入口，点击后进入只保留英文资源的主题搜索。
          </p>
        </div>
        <TopicMarquee topics={lifeTopics} />
      </section>

      {user && (
        <section className="space-y-5 py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">继续收听</p>
              <h2 className="studio-title mt-1 text-3xl">接着上次的练习</h2>
            </div>
            <Link to="/library/progress" className="text-sm font-semibold text-amber-100 hover:text-white">查看进度 -&gt;</Link>
          </div>
          <ContinueListening items={library?.recentProgress || []} loading={libraryLoading} />
        </section>
      )}

      <section className="space-y-8 py-16 md:py-28">
        <div className="home-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="studio-eyebrow">跟读推荐</p>
            <h2 className="studio-title mt-2 max-w-3xl text-4xl leading-tight sm:text-5xl">按练习适配度推荐，而不是只追最新</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            每一组都从练习目标出发，结合英文趋势播客和主题搜索，再按跟读适配度排序。
          </p>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-studio border border-white/10 bg-white/[.06]" />)}
          </div>
        ) : (
          <div className="space-y-12">
            {learningCategories.slice(0, 2).map((category) => (
              <CategoryShelf
                key={category.id}
                category={category}
                podcasts={(categoryResults[category.id] || []).slice(0, 2)}
                saveCounts={saveCounts}
                onSaveCountChange={setPodcastSaveCount}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home-reveal overflow-hidden rounded-console border border-ember-300/20 bg-ember-300/10 p-8 sm:p-10 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="studio-eyebrow">下一段练习</p>
            <h2 className="studio-title mt-2 max-w-4xl text-4xl leading-tight sm:text-6xl">找一个你真的想听的话题开始</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
              不为了学英语而学英语。先选兴趣，再用字幕、收藏和重复控制把英文听成自己的表达。
            </p>
          </div>
          <Link to={`/search?q=${encodeURIComponent(firstCategory.query)}`} className="studio-button-primary">
            进入练习
          </Link>
        </div>
      </section>
    </div>
  )
}

function HeroProductPreview({ podcasts }: { podcasts: PodcastFeed[] }) {
  const covers = podcasts.length > 0 ? podcasts : [
    { id: 1, title: 'Everyday English stories', url: '#', image: 'https://picsum.photos/seed/podcast-cover-a/600/600', author: 'ShadowCast', description: '', language: 'en' },
    { id: 2, title: 'Food conversations', url: '#', image: 'https://picsum.photos/seed/podcast-cover-b/600/600', author: 'ShadowCast', description: '', language: 'en' },
    { id: 3, title: 'Workplace interviews', url: '#', image: 'https://picsum.photos/seed/podcast-cover-c/600/600', author: 'ShadowCast', description: '', language: 'en' },
  ] as PodcastFeed[]

  return (
    <div className="home-reveal relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="absolute -right-10 top-8 hidden h-44 w-44 rounded-full bg-ember-300/20 blur-3xl lg:block" />
      <div className="relative overflow-hidden rounded-console border border-white/12 bg-ink-950/72 p-4 shadow-panel backdrop-blur-2xl">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="grid grid-cols-3 gap-2 sm:block sm:space-y-3">
            {covers.slice(0, 3).map((podcast, index) => (
              <div key={podcast.id} className={`overflow-hidden rounded-2xl border border-white/10 bg-white/10 ${index === 0 ? 'sm:h-32' : 'sm:h-20'}`}>
                <img
                  src={podcast.image || podcast.artwork || `https://picsum.photos/seed/podcast-${podcast.id}/600/600`}
                  alt={podcast.title}
                  className="h-full min-h-20 w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>

          <div className="rounded-console border border-paper-700/10 bg-paper-50 p-4 text-paper-900 shadow-paper">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-paper-300">字幕跟读</span>
              <span className="rounded-full border border-paper-700/15 px-2.5 py-1 font-mono text-[10px] text-paper-700/60">03:02</span>
            </div>
            <div className="space-y-3">
              {[
                'I use this phrase when I want the conversation to feel natural.',
                'The better version is slower, clearer, and easier to repeat.',
                'Now pause here, listen again, and copy the rhythm.',
              ].map((line, index) => (
                <div key={line} className={`rounded-2xl px-3 py-2 ${index === 1 ? 'bg-ember-300/28 shadow-sm' : 'bg-paper-100/55'}`}>
                  <p className="text-sm leading-6 text-paper-900/78">{line}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-paper-700/10 bg-paper-900 p-3 text-paper-50">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ember-300 text-ink-950">
                  <Play className="ml-0.5 h-4 w-4" weight="fill" aria-hidden="true" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-2/5 rounded-full bg-ember-300" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] text-paper-50/72">
                <span>上一句</span>
                <span>重复</span>
                <span>下一句</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PracticeBento() {
  return (
    <div className="grid grid-flow-dense gap-4 lg:grid-cols-6 lg:auto-rows-[13rem]">
      <BentoCard className="lg:col-span-3 lg:row-span-2" title="逐句字幕练习" text="把长音频拆成可点击、可收藏、可重复的句子。学习者不用在进度条里来回猜位置。">
        <div className="mt-6 space-y-3">
          {['先听清句子里的停顿。', '完整跟读这一句。', '保存这条表达，稍后复习。'].map((line, index) => (
            <div key={line} className={`rounded-2xl border px-4 py-3 text-sm ${index === 1 ? 'border-ember-300/35 bg-ember-300/[.18] font-medium text-amber-50' : 'border-white/10 bg-white/[.07] text-slate-200'}`}>
              {line}
            </div>
          ))}
        </div>
      </BentoCard>
      <BentoCard className="lg:col-span-3" title="英文资源优先" text="搜索时不再额外拼接英文关键词，只通过语言过滤保留英文内容，减少空结果。" />
      <BentoCard className="lg:col-span-2" title="生活主题直达" text="美食、旅行、健康和书籍等入口，更接近用户的真实兴趣。" />
      <BentoCard className="lg:col-span-1" title="收藏参与排序" text="更受欢迎的资源会更靠前。" compact />
    </div>
  )
}

function BentoCard({ title, text, className = '', compact, children }: { title: string; text: string; className?: string; compact?: boolean; children?: ReactNode }) {
  return (
    <article className={`group overflow-hidden rounded-console border border-white/10 bg-white/[.045] p-5 transition duration-300 hover:-translate-y-1 hover:border-ember-300/30 hover:bg-white/[.07] ${className}`}>
      <div className="h-full">
        <h3 className={`${compact ? 'text-2xl' : 'text-3xl'} font-display font-bold leading-tight text-slate-50`}>{title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
        {children}
      </div>
    </article>
  )
}

function SceneAccordion({ categories }: { categories: LearningCategory[] }) {
  return (
    <>
      <div className="hidden h-[28rem] gap-3 lg:flex">
        {categories.slice(0, 5).map((category, index) => (
          <Link
            key={category.id}
            to={`/search?q=${encodeURIComponent(category.query)}`}
            className="group flex-[.86] overflow-hidden rounded-console border border-white/10 bg-white/[.045] transition-[flex,transform,border-color,background] duration-500 hover:flex-[2.8] hover:-translate-y-1 hover:border-ember-300/35 hover:bg-ember-300/10"
          >
            <div className="flex h-full min-w-0 flex-col justify-between p-5">
              <span className="font-mono text-[11px] uppercase tracking-[.16em] text-ember-200">{category.label}</span>
              <div>
                <h3 className="max-w-xs font-display text-3xl font-bold leading-tight text-white">{category.title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300 opacity-0 transition duration-500 group-hover:opacity-100">{category.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 lg:hidden">
        {categories.slice(0, 4).map((category) => (
          <Link key={category.id} to={`/search?q=${encodeURIComponent(category.query)}`} className="rounded-2xl border border-white/10 bg-white/[.045] p-4 transition hover:border-ember-300/35 hover:bg-ember-300/10">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-ember-200">{category.label}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{category.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{category.focus}</p>
          </Link>
        ))}
        <Link to="/search?q=pronunciation" className="mt-1 inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-ember-300/35 hover:bg-ember-300/10 hover:text-white">
          查看更多练习场景
        </Link>
      </div>
    </>
  )
}

function TopicMarquee({ topics }: { topics: LifeTopic[] }) {
  const visibleTopics = topics.slice(0, 18)
  const marqueeTopics = [...visibleTopics, ...visibleTopics]

  return (
    <div className="overflow-hidden border-y border-white/10 py-4">
      <div className="studio-marquee-track flex w-max gap-3">
        {marqueeTopics.map((topic, index) => (
          <Link
            key={`${topic.name}-${index}`}
            to={`/search?q=${encodeURIComponent(topic.name.toLowerCase())}`}
            title={topic.description}
            className={`inline-flex items-center rounded-full border border-white/10 bg-white/[.045] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 ${topicAccent}`}
          >
            {topic.label}
          </Link>
        ))}
      </div>
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
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            {category.description} 适合练习：{category.focus}。
          </p>
        </div>
        <Link to={`/search?q=${encodeURIComponent(category.query)}`} className="text-sm font-semibold text-amber-100 hover:text-white">
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
