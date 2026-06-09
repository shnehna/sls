import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCachedEpisodeById, getEpisodeById } from '../api/client'
import type { Episode as EpisodeType } from '../api/types'
import AudioPlayer from '../components/AudioPlayer'
import ShadowControls from '../components/ShadowControls'
import Transcript from '../components/Transcript'
import { usePlayer } from '../context/PlayerContext'
import { formatDate, formatDuration, formatTime, truncate } from '../utils/format'

function EpisodeArtwork({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="grid h-full w-full place-items-center bg-ink-800 text-5xl text-ember-300">♪</div>
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

  if (!episodeId) return <div className="text-sm text-slate-400">Invalid episode id.</div>

  if (loading) {
    return (
      <div className="grid gap-5 pb-24 lg:grid-cols-[24rem_1fr]">
        <div className="h-[42rem] animate-pulse rounded-deck border border-white/10 bg-white/[.06]" />
        <div className="h-[42rem] animate-pulse rounded-deck border border-paper-700/10 bg-paper-50/80" />
      </div>
    )
  }

  if (error || !episode) {
    return <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error || 'Episode not found'}</div>
  }

  const hasTranscript = !!(episode.transcripts?.length || episode.transcriptUrl)

  return (
    <div className="pb-10">
      <div className="grid gap-5 lg:grid-cols-[25rem_minmax(0,1fr)] lg:items-start">
        <aside className="studio-practice-deck space-y-5">
          <Link to={`/podcast/${episode.feedId || ''}`} className="inline-flex items-center font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400 transition hover:text-ember-200">
            ← Back to podcast
          </Link>

          <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[.04]">
            <div className="aspect-square max-h-72 w-full overflow-hidden lg:max-h-none">
              <EpisodeArtwork src={episode.image || episode.feedImage} title={episode.title} />
            </div>
          </div>

          <section>
            <p className="studio-eyebrow">Listening deck</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-[.98] tracking-[-.05em] text-slate-50 sm:text-4xl lg:text-3xl xl:text-4xl">
              {episode.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {episode.feedTitle && <span className="studio-chip">{episode.feedTitle}</span>}
              {episode.duration && <span className="studio-chip">{formatDuration(episode.duration)}</span>}
              {episode.datePublished && <span className="studio-chip">{formatDate(episode.datePublished)}</span>}
              <span className={`studio-chip ${hasTranscript ? '!border-emerald-300/30 !bg-emerald-300/10 !text-emerald-200' : '!border-white/10 !text-slate-500'}`}>
                {hasTranscript ? 'Transcript ready' : 'No transcript'}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-400">{truncate(episode.description || '', 260)}</p>
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

          {activeCue && (
            <div className="rounded-2xl border border-aurora-300/15 bg-aurora-300/10 p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-aurora-200">Current cue</p>
              <p className="mt-2 font-mono text-sm text-slate-100">{formatTime(activeCue.startTime)} — {formatTime(activeCue.endTime)}</p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{activeCue.text}</p>
            </div>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <h3 className="font-display text-xl font-bold tracking-[-.04em] text-slate-50">Keyboard</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <kbd className="studio-kbd">← previous</kbd>
              <kbd className="studio-kbd">→ next</kbd>
              <kbd className="studio-kbd">R repeat</kbd>
              <kbd className="studio-kbd">Space play</kbd>
            </div>
          </section>
        </aside>

        <Transcript
          cues={cues}
          currentTime={state.currentTime}
          activeCueIndex={state.activeCueIndex}
          onCueClick={seekToCue}
          loading={loadingTranscript}
        />
      </div>
    </div>
  )
}
