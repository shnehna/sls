import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EpisodeCard from '../components/EpisodeCard'
import { useEpisodes } from '../hooks/useEpisodes'
import { usePodcast } from '../hooks/usePodcast'
import { truncate } from '../utils/format'

function PodcastArtwork({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="grid h-full w-full place-items-center bg-slate-100 text-4xl text-slate-400">♪</div>
  }

  return (
    <img
      src={src}
      alt={title}
      className="h-full w-full object-cover"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

export default function Podcast() {
  const { id } = useParams()
  const feedId = id ? Number(id) : null
  const { podcast, loading: loadingPodcast, error: podcastError } = usePodcast(feedId)
  const { episodes, loading: loadingEpisodes, error: episodesError } = useEpisodes(feedId)

  if (!feedId) return <div className="text-sm text-slate-600">Invalid podcast id.</div>

  return (
    <div className="space-y-6 pb-24">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-950">
        ← Back to home
      </Link>

      {loadingPodcast ? (
        <div className="h-56 rounded-xl border border-slate-200 bg-white animate-pulse" />
      ) : podcastError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{podcastError}</div>
      ) : podcast && (
        <section className="studio-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-40 sm:w-40">
              <PodcastArtwork src={podcast.artwork || podcast.image} title={podcast.title} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="studio-eyebrow">Podcast</p>
              <h1 className="studio-title mt-2 text-3xl sm:text-4xl">{podcast.title}</h1>
              {podcast.author && <p className="mt-2 text-sm text-slate-500">by {podcast.author}</p>}
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{truncate(podcast.description || '', 420)}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {podcast.language && <span className="studio-chip uppercase">{podcast.language}</span>}
                {podcast.episodeCount !== undefined && <span className="studio-chip">{podcast.episodeCount} episodes</span>}
                {podcast.categories && Object.values(podcast.categories).slice(0, 4).map((cat) => (
                  <span key={cat} className="studio-chip">{cat}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="studio-eyebrow">Episodes</p>
            <h2 className="studio-title mt-1 text-2xl">Choose an episode</h2>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-slate-500 sm:block">Episodes with transcripts work best for shadow reading.</p>
        </div>

        {loadingEpisodes ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />)}
          </div>
        ) : episodesError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{episodesError}</div>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} />)}
          </div>
        )}
      </section>
    </div>
  )
}
