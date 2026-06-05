import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCachedEpisodeById, getEpisodeById } from '../api/client'
import type { Episode as EpisodeType } from '../api/types'
import AudioPlayer from '../components/AudioPlayer'
import ShadowControls from '../components/ShadowControls'
import Transcript from '../components/Transcript'
import { usePlayer } from '../context/PlayerContext'
import { formatDate, formatDuration, truncate } from '../utils/format'

function EpisodeArtwork({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="grid h-full w-full place-items-center bg-slate-100 text-4xl text-slate-400">♪</div>
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

export default function Episode() {
  const { id } = useParams()
  const episodeId = id ? Number(id) : null
  const [episode, setEpisode] = useState<EpisodeType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loopCurrentCue, setLoopCurrentCue] = useState(false)

  const {
    state,
    cues,
    loadingTranscript,
    loadEpisode,
    togglePlay,
    play,
    seek,
    setRate,
    seekToCue,
    nextCue,
    prevCue,
  } = usePlayer()

  useEffect(() => {
    if (!episodeId) return

    let cancelled = false
    const cached = getCachedEpisodeById(episodeId)

    if (cached) {
      setEpisode(cached.episode)
      loadEpisode(cached.episode)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(null)

    getEpisodeById(episodeId, cached ? { forceRefresh: true } : undefined)
      .then((data) => {
        if (cancelled) return
        setEpisode(data.episode)
        loadEpisode(data.episode)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setError(err instanceof Error ? err.message : 'Failed to load episode')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [episodeId, loadEpisode])

  const activeCue = useMemo(() => cues[state.activeCueIndex], [cues, state.activeCueIndex])

  useEffect(() => {
    if (!loopCurrentCue || !activeCue) return
    if (state.currentTime >= activeCue.endTime - 0.08) {
      seek(activeCue.startTime)
      play()
    }
  }, [loopCurrentCue, activeCue, state.currentTime, seek, play])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowLeft') prevCue()
      if (event.key === 'ArrowRight') nextCue()
      if (event.key.toLowerCase() === 'r' && activeCue) {
        seek(activeCue.startTime)
        play()
      }
      if (event.key === ' ') {
        event.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeCue, nextCue, play, prevCue, seek, togglePlay])

  const repeatActiveCue = useCallback(() => {
    if (activeCue) {
      seek(activeCue.startTime)
      play()
    }
  }, [activeCue, play, seek])

  if (!episodeId) return <div className="text-sm text-slate-600">Invalid episode id.</div>

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    )
  }

  if (error || !episode) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Episode not found'}</div>
  }

  const hasTranscript = !!(episode.transcripts?.length || episode.transcriptUrl)

  return (
    <div className="space-y-5 pb-24">
      <Link to={`/podcast/${episode.feedId || ''}`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-950">
        ← Back to podcast
      </Link>

      <section className="studio-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-36 sm:w-36">
            <EpisodeArtwork src={episode.image || episode.feedImage} title={episode.title} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="studio-eyebrow">Episode</p>
            <h1 className="studio-title mt-2 text-2xl sm:text-4xl">{episode.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {episode.feedTitle && <span className="studio-chip">{episode.feedTitle}</span>}
              {episode.duration && <span className="studio-chip">{formatDuration(episode.duration)}</span>}
              {episode.datePublished && <span className="studio-chip">{formatDate(episode.datePublished)}</span>}
              <span className={`studio-chip ${hasTranscript ? '!border-emerald-200 !bg-emerald-50 !text-emerald-700' : ''}`}>
                {hasTranscript ? 'Transcript ready' : 'No transcript'}
              </span>
            </div>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{truncate(episode.description || '', 420)}</p>
          </div>
        </div>
      </section>

      <AudioPlayer compact />

      <ShadowControls
        playbackRate={state.playbackRate}
        activeStart={activeCue?.startTime}
        activeEnd={activeCue?.endTime}
        onRateChange={setRate}
        onPrevCue={prevCue}
        onNextCue={nextCue}
        onRepeatCue={repeatActiveCue}
        onLoopChange={setLoopCurrentCue}
      />

      <Transcript
        cues={cues}
        currentTime={state.currentTime}
        activeCueIndex={state.activeCueIndex}
        onCueClick={seekToCue}
        loading={loadingTranscript}
      />

      <section className="studio-panel p-4 text-sm text-slate-600">
        <h3 className="font-semibold text-slate-950">Keyboard shortcuts</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">← previous cue</kbd>
          <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">→ next cue</kbd>
          <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">R repeat cue</kbd>
          <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">Space play/pause</kbd>
        </div>
      </section>
    </div>
  )
}
