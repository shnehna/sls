import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EpisodeCard from '../components/EpisodeCard'
import { useEpisodes } from '../hooks/useEpisodes'
import { usePodcast } from '../hooks/usePodcast'
import { truncate } from '../utils/format'

function PodcastArtwork({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="grid h-full w-full place-items-center bg-ink-800 text-4xl text-ember-300">♪</div>
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

  if (!feedId) return <div className="text-sm text-slate-400">Invalid podcast id.</div>

  return (
    <div className="space-y-7 pb-28">
      <Link to="/" className="inline-flex items-center font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400 transition hover:text-ember-200">
        ← Back to home
      </Link>

      {loadingPodcast ? (
        <div className="h-56 animate-pulse rounded-deck border border-white/10 bg-white/[.06]" />
      ) : podcastError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{podcastError}</div>
      ) : podcast && (
        <section className="studio-panel p-5 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="h-36 w-36 flex-shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.06] shadow-glow sm:h-44 sm:w-44">
              <PodcastArtwork src={podcast.artwork || podcast.image} title={podcast.title} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="studio-eyebrow">Podcast archive</p>
              <h1 className="studio-title mt-2 text-4xl leading-none sm:text-6xl">{podcast.title}</h1>
              {podcast.author && <p className="mt-3 text-sm text-slate-400">by {podcast.author}</p>}
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">{truncate(podcast.description || '', 420)}</p>
              <div className="mt-6 flex flex-wrap gap-2">
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
            <h2 className="studio-title mt-1 text-3xl">Choose an episode</h2>
          </div>
          <p className="hidden max-w-xs text-right text-sm leading-6 text-slate-400 sm:block">Episodes with transcripts work best for shadow reading.</p>
        </div>

        {loadingEpisodes ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-studio border border-white/10 bg-white/[.06]" />)}
          </div>
        ) : episodesError ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{episodesError}</div>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} />)}
          </div>
        )}
      </section>
    </div>
  )
}
