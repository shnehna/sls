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
    <Link to={`/episode/${episode.id}`} className="studio-card block p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {episode.episode && <span className="studio-chip">#{episode.episode}</span>}
            {hasTranscript && <span className="studio-chip !border-emerald-200 !bg-emerald-50 !text-emerald-700">Transcript</span>}
            {episode.duration && <span className="studio-chip">{formatDuration(episode.duration)}</span>}
          </div>

          <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-950">
            {episode.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {truncate(episode.description || '', 220)}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {episode.datePublishedPretty && <span>{episode.datePublishedPretty}</span>}
            {episode.datePublished && !episode.datePublishedPretty && <span>{formatDate(episode.datePublished)}</span>}
            {persons.length > 0 && <span>{persons.map((p) => p.name).join(' · ')}</span>}
          </div>
        </div>
        <span className="hidden shrink-0 text-sm font-medium text-blue-600 sm:block">Open →</span>
      </div>
    </Link>
  )
}
