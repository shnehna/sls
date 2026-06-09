import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCachedRecentData, getRecentData } from '../api/client'
import type { PodcastFeed, RecentDataResponse, RecentEpisodeItem } from '../api/types'
import PodcastCard from '../components/PodcastCard'
import { formatDuration, timeAgo, truncate } from '../utils/format'

function mapDiscoveryData(data: RecentDataResponse) {
  const feeds = (data.data.feeds || [])
    .filter((feed) => !feed.feedLanguage || feed.feedLanguage.toLowerCase().startsWith('en'))
    .slice(0, 12)
    .map<PodcastFeed>((feed) => ({
      id: feed.feedId,
      title: feed.feedTitle,
      url: feed.feedUrl,
      description: feed.feedDescription,
      image: feed.feedImage,
      artwork: feed.feedImage,
      language: feed.feedLanguage,
      itunesId: feed.feedItunesId,
    }))

  const episodes = (data.data.items || [])
    .filter((episode) => episode.episodeEnclosureType?.startsWith('audio'))
    .slice(0, 6)

  return { feeds, episodes }
}

function RecentEpisodeArtwork({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="grid h-full place-items-center bg-ink-800 text-3xl text-ember-300">♪</div>
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      aria-label={title}
    />
  )
}

export default function Home() {
  const [feeds, setFeeds] = useState<PodcastFeed[]>([])
  const [episodes, setEpisodes] = useState<RecentEpisodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const cached = getCachedRecentData(36)

    if (cached) {
      const discovery = mapDiscoveryData(cached)
      setFeeds(discovery.feeds)
      setEpisodes(discovery.episodes)
      setLoading(false)
    }

    getRecentData(36, undefined, cached ? { forceRefresh: true } : undefined)
      .then((data) => {
        if (cancelled) return
        const discovery = mapDiscoveryData(data)
        setFeeds(discovery.feeds)
        setEpisodes(discovery.episodes)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setError(err instanceof Error ? err.message : 'Unable to load discovery data')
        }
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
            <p className="studio-eyebrow">English listening practice</p>
            <h1 className="studio-title mt-4 text-5xl leading-[.93] sm:text-7xl">
              Listen like a studio editor. Repeat like a performer.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              A focused podcast shadow-reading desk with searchable English feeds, synced transcripts, speed control, and cue-level repeat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search?q=english learning" className="studio-button-primary">Start practice</Link>
              <Link to="/search?q=news" className="studio-button-ghost">Browse news podcasts</Link>
            </div>
          </div>

          <div className="relative min-h-72 overflow-hidden rounded-deck border border-white/10 bg-ink-950/45 p-5 shadow-glow">
            <div className="absolute inset-0 waveform-strip opacity-40" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[.18em] text-slate-400">
                <span>Practice console</span>
                <span className="text-ember-300">Live cues</span>
              </div>
              <div className="mt-14 space-y-3">
                {['Hear the line', 'Repeat the rhythm', 'Track every word'].map((label, index) => (
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
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="studio-eyebrow">Discover</p>
            <h2 className="studio-title mt-1 text-3xl">Recently added English feeds</h2>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-studio border border-white/10 bg-white/[.06]" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {feeds.map((feed) => <PodcastCard key={feed.id} podcast={feed} />)}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="studio-eyebrow">Quick play</p>
          <h2 className="studio-title mt-1 text-3xl">New audio for listening drills</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {episodes.map((episode) => (
            <Link key={episode.episodeId} to={`/episode/${episode.episodeId}`} className="studio-card group block overflow-hidden">
              <div className="aspect-video border-b border-white/10 bg-white/[.06]">
                <RecentEpisodeArtwork src={episode.episodeImage} title={episode.episodeTitle} />
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight tracking-[-.04em] text-slate-50 group-hover:text-ember-100">{episode.episodeTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{truncate(episode.episodeDescription, 120)}</p>
                <div className="mt-4 flex justify-between font-mono text-[11px] uppercase tracking-[.08em] text-slate-500">
                  <span>{timeAgo(episode.episodeAdded)}</span>
                  <span>{formatDuration(episode.episodeDuration)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
