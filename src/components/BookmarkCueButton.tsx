import { useState } from 'react'
import { createTranscriptBookmark, deleteTranscriptBookmark, type TranscriptBookmarkItem } from '../api/library'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

interface Props {
  episodeId: number
  transcriptId?: string
  cueIndex?: number
  cueText?: string
  cueStartTime?: number
  cueEndTime?: number
  episodeTitle?: string
  podcastTitle?: string
  existing?: TranscriptBookmarkItem | null
}

export default function BookmarkCueButton({
  episodeId,
  transcriptId,
  cueIndex,
  cueText,
  cueStartTime,
  cueEndTime,
  episodeTitle,
  podcastTitle,
  existing,
}: Props) {
  const { user } = useAuth()
  const { refreshLibrary } = useLibrary()
  const [working, setWorking] = useState(false)
  const [saved, setSaved] = useState(existing || null)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const handleClick = async () => {
    setWorking(true)
    setError(null)
    try {
      if (saved) {
        await deleteTranscriptBookmark(saved.id)
        setSaved(null)
      } else {
        const result = await createTranscriptBookmark({
          episodeId,
          transcriptId,
          cueIndex,
          cueText,
          cueStartTime,
          cueEndTime,
          episodeTitle,
          podcastTitle,
        })
        setSaved(result.bookmark)
      }
      await refreshLibrary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bookmark update failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={working}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] transition ${saved ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-700' : 'border-paper-700/10 bg-white/35 text-paper-700/65 hover:border-amber-500/30 hover:text-paper-900'}`}
      title={error || ''}
    >
      {working ? 'Saving…' : saved ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}
