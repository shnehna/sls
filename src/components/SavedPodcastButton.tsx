import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { PodcastFeed } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

interface Props {
  podcast: Pick<PodcastFeed, 'id' | 'title' | 'image' | 'artwork' | 'url' | 'author'>
  compact?: boolean
  onSavedChange?: (saved: boolean) => void
}

export default function SavedPodcastButton({ podcast, compact = false, onSavedChange }: Props) {
  const { user } = useAuth()
  const { isSavedPodcast, savePodcast, removeSavedPodcast } = useLibrary()
  const [working, setWorking] = useState(false)
  const saved = isSavedPodcast(podcast.id)
  const className = compact
    ? 'rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-ember-300/40 hover:text-ember-100'
    : 'studio-button-ghost'

  if (!user) {
    return <Link to="/auth/login" className={className}>登录后收藏</Link>
  }

  const handleClick = async () => {
    if (working) return
    setWorking(true)
    try {
      if (saved) {
        await removeSavedPodcast(podcast.id)
        onSavedChange?.(false)
      } else {
        await savePodcast({
          podcastId: podcast.id,
          title: podcast.title,
          image: podcast.artwork || podcast.image,
          url: podcast.url,
          author: podcast.author,
        })
        onSavedChange?.(true)
      }
    } finally {
      setWorking(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={working}
      className={saved ? `${className} !border-emerald-300/30 !bg-emerald-300/10 !text-emerald-200` : className}
    >
      {working ? '保存中...' : saved ? '已收藏' : '收藏播客'}
    </button>
  )
}
