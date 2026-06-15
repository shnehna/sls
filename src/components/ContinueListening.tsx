import ProgressCard from './ProgressCard'
import type { EpisodeProgressItem } from '../api/library'

interface Props {
  items: EpisodeProgressItem[]
  loading?: boolean
}

export default function ContinueListening({ items, loading }: Props) {
  if (loading) {
    return <div className="h-32 animate-pulse rounded-studio border border-white/10 bg-white/[.06]" />
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 text-sm leading-6 text-slate-400">
        Start an episode to build your continue listening queue.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => <ProgressCard key={item.id} progress={item} />)}
    </div>
  )
}
