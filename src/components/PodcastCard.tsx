import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { PodcastFeed } from '../api/types'
import { truncate } from '../utils/format'

interface Props {
  podcast: PodcastFeed
}

export default function PodcastCard({ podcast }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const categories = podcast.categories ? Object.values(podcast.categories).slice(0, 2) : []
  const artwork = podcast.artwork || podcast.image

  return (
    <Link to={`/podcast/${podcast.id}`} className="studio-card group flex gap-4 p-4">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] shadow-glow sm:h-24 sm:w-24">
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
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {podcast.language && <span className="studio-chip uppercase">{podcast.language}</span>}
          {podcast.episodeCount !== undefined && <span className="studio-chip">{podcast.episodeCount} eps</span>}
        </div>
        <h3 className="truncate text-base font-semibold text-slate-50 transition group-hover:text-ember-100">
          {podcast.title}
        </h3>
        {podcast.author && <p className="mt-1 truncate text-sm text-slate-400">{podcast.author}</p>}
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
          {truncate(podcast.description || '', 190)}
        </p>
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => <span key={category} className="font-mono text-[11px] text-aurora-200/80">#{category}</span>)}
          </div>
        )}
      </div>
    </Link>
  )
}
