import { Link } from 'react-router-dom'
import type { EpisodeProgressItem } from '../api/library'
import { formatTime, timeAgo } from '../utils/format'

interface Props {
  progress: EpisodeProgressItem
}

export default function ProgressCard({ progress }: Props) {
  const percent = progress.durationSeconds ? Math.min(100, Math.round((progress.positionSeconds / progress.durationSeconds) * 100)) : 0

  return (
    <Link to={`/episode/${progress.episodeId}?t=${Math.floor(progress.positionSeconds)}`} className="studio-card group block p-4">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] text-2xl text-ember-300">
          {progress.episodeImage || progress.podcastImage ? (
            <img src={progress.episodeImage || progress.podcastImage} alt="" className="h-full w-full object-cover" />
          ) : '♪'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="studio-eyebrow">Continue listening</p>
          <h3 className="mt-2 line-clamp-2 font-display text-xl font-bold leading-tight tracking-[-.04em] text-slate-50 group-hover:text-ember-100">
            {progress.episodeTitle || `Episode ${progress.episodeId}`}
          </h3>
          {progress.podcastTitle && <p className="mt-1 truncate text-sm text-slate-400">{progress.podcastTitle}</p>}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-aurora-300 to-ember-300" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[.08em] text-slate-500">
            <span>{formatTime(progress.positionSeconds)}</span>
            <span>{percent}% · {timeAgo(Math.floor(new Date(progress.updatedAt).getTime() / 1000))}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
