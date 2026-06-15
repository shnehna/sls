import { Link } from 'react-router-dom'
import type { PodcastFeed } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

interface Props {
  podcast: Pick<PodcastFeed, 'id' | 'title' | 'image' | 'artwork' | 'url' | 'author'>
  compact?: boolean
}

export default function SavedPodcastButton({ podcast, compact = false }: Props) {
  const { user } = useAuth()
  const { isSavedPodcast, savePodcast, removeSavedPodcast } = useLibrary()
  const saved = isSavedPodcast(podcast.id)
  const className = compact
    ? 'rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-ember-300/40 hover:text-ember-100'
    : 'studio-button-ghost'

  if (!user) {
    return <Link to="/auth/login" className={className}>Log in to save</Link>
  }

  return (
    <button
      type="button"
      onClick={() => saved
        ? void removeSavedPodcast(podcast.id)
        : void savePodcast({
          podcastId: podcast.id,
          title: podcast.title,
          image: podcast.artwork || podcast.image,
          url: podcast.url,
          author: podcast.author,
        })
      }
      className={saved ? `${className} !border-emerald-300/30 !bg-emerald-300/10 !text-emerald-200` : className}
    >
      {saved ? 'Saved' : 'Save podcast'}
    </button>
  )
}
