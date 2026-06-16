import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { PodcastFeed } from '../api/types'
import SavedPodcastButton from './SavedPodcastButton'
import { truncate } from '../utils/format'

interface Props {
  podcast: PodcastFeed
  saveCount?: number
  onSaveCountChange?: (podcastId: number, updater: (current: number) => number) => void
}

export default function PodcastCard({ podcast, saveCount, onSaveCountChange }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const categories = podcast.categories ? Object.values(podcast.categories).slice(0, 2) : []
  const artwork = podcast.artwork || podcast.image
  const visibleSaveCount = saveCount ?? 0

  return (
    <article className="studio-card group flex gap-4 p-4">
      <Link to={`/podcast/${podcast.id}`} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] shadow-glow sm:h-24 sm:w-24">
        {artwork && !imageFailed ? (
          <img
            src={artwork}
            alt={podcast.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-ink-800 text-2xl text-ember-300">♪</div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link to={`/podcast/${podcast.id}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {podcast.language && <span className="studio-chip uppercase">{podcast.language}</span>}
            {podcast.episodeCount !== undefined && <span className="studio-chip">{podcast.episodeCount} 集</span>}
            <span className="studio-chip">{visibleSaveCount} 人收藏</span>
          </div>
          <h3 className="truncate text-base font-semibold text-slate-50 transition hover:text-ember-100">
            {podcast.title}
          </h3>
          {podcast.author && <p className="mt-1 truncate text-sm text-slate-400">{podcast.author}</p>}
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
            {truncate(podcast.description || '', 190)}
          </p>
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => <span key={category} className="font-mono text-[11px] text-aurora-200/80">#{category}</span>)}
          </div>
          <SavedPodcastButton
            podcast={podcast}
            compact
            onSavedChange={(saved) => {
              onSaveCountChange?.(podcast.id, (current) => current + (saved ? 1 : -1))
            }}
          />
        </div>
      </div>
    </article>
  )
}
