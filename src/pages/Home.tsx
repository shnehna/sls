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
    return <div className="grid h-full place-items-center bg-slate-100 text-2xl text-slate-400">♪</div>
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
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
    <div className="space-y-10 pb-24">
      <section className="studio-panel p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="studio-eyebrow">English listening practice</p>
          <h1 className="studio-title mt-3 text-3xl sm:text-5xl">
            Find a podcast. Listen, repeat, and follow the transcript.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            A simple podcast player for shadow reading practice with searchable English feeds, timed transcripts, speed control, and cue repeat.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/search?q=english learning" className="studio-button-primary">Start practice</Link>
            <Link to="/search?q=news" className="studio-button-ghost">Browse news podcasts</Link>
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="studio-eyebrow">Discover</p>
            <h2 className="studio-title mt-1 text-2xl">Recently added English feeds</h2>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />)}
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
          <h2 className="studio-title mt-1 text-2xl">New audio for listening drills</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {episodes.map((episode) => (
            <Link key={episode.episodeId} to={`/episode/${episode.episodeId}`} className="studio-card block overflow-hidden">
              <div className="aspect-video border-b border-slate-200 bg-slate-100">
                <RecentEpisodeArtwork src={episode.episodeImage} title={episode.episodeTitle} />
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950">{episode.episodeTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{truncate(episode.episodeDescription, 120)}</p>
                <div className="mt-4 flex justify-between text-xs text-slate-500">
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
