import { Link } from 'react-router-dom'
import type { Episode } from '../api/types'
import { formatDate, formatDuration, truncate } from '../utils/format'

interface Props {
  episode: Episode
}

export default function EpisodeCard({ episode }: Props) {
  const hasTranscript = !!(episode.transcripts && episode.transcripts.length > 0) || !!episode.transcriptUrl
  const persons = episode.persons?.filter(
    (p) => p.role?.toLowerCase().includes('host') || p.group?.toLowerCase() === 'cast'
  ) || []

  return (
    <Link to={`/episode/${episode.id}`} className="studio-card group block p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {episode.episode && <span className="studio-chip">#{episode.episode}</span>}
            {hasTranscript && <span className="studio-chip !border-emerald-300/30 !bg-emerald-300/10 !text-emerald-200">有字幕</span>}
            {episode.duration && <span className="studio-chip">{formatDuration(episode.duration)}</span>}
          </div>

          <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-[-.04em] text-slate-50 transition group-hover:text-ember-100">
            {episode.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
            {truncate(episode.description || '', 220)}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[.08em] text-slate-500">
            {episode.datePublishedPretty && <span>{episode.datePublishedPretty}</span>}
            {episode.datePublished && !episode.datePublishedPretty && <span>{formatDate(episode.datePublished)}</span>}
            {persons.length > 0 && <span>{persons.map((p) => p.name).join(' · ')}</span>}
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-sm font-medium text-aurora-200 transition group-hover:border-ember-300/30 group-hover:text-ember-100 sm:block">打开 →</span>
      </div>
    </Link>
  )
}
