import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MusicNote } from '@phosphor-icons/react'
import { getCachedEpisodeById, getEpisodeById } from '../api/client'
import type { Episode as EpisodeType } from '../api/types'
import EpisodeAudioControls from '../components/EpisodeAudioControls'
import LockedTranscriptPanel from '../components/LockedTranscriptPanel'
import Transcript from '../components/Transcript'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { formatDate, formatDuration } from '../utils/format'

function EpisodeArtwork({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-ink-800 text-5xl text-ember-300">
        <MusicNote weight="fill" aria-hidden="true" />
      </div>
    )
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
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const episodeId = id ? Number(id) : null
  const [episode, setEpisode] = useState<EpisodeType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loopCurrentCue, setLoopCurrentCue] = useState(false)

  const {
    state,
    cues,
    loadingTranscript,
    transcriptStatus,
    transcriptSource,
    transcriptError,
    transcriptJob,
    transcriptId,
    hasRemoteTranscript,
    loadEpisode,
    refreshTranscript,
    importCurrentTranscript,
    createTranscriptJob,
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
          setError(err instanceof Error ? err.message : '加载剧集失败')
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
    const timeParam = Number(searchParams.get('t'))
    if (episode && Number.isFinite(timeParam) && timeParam > 0) seek(timeParam)
  }, [episode?.id, searchParams, seek])

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

  if (!episodeId) return <div className="text-sm text-slate-400">无效的剧集 ID。</div>

  if (loading) {
    return (
      <div className="grid gap-5 pb-24 lg:grid-cols-[24rem_1fr]">
        <div className="h-[42rem] animate-pulse rounded-deck border border-white/10 bg-white/[.06]" />
        <div className="h-[42rem] animate-pulse rounded-deck border border-paper-700/10 bg-paper-50/80" />
      </div>
    )
  }

  if (error || !episode) {
    return <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error || '没有找到这集节目'}</div>
  }

  const hasTranscript = !!(episode.transcripts?.length || episode.transcriptUrl)

  return (
    <div className="space-y-4 pb-80 xl:pb-44">
      <header className="rounded-console border border-white/10 bg-white/[.045] p-3 shadow-panel backdrop-blur-xl sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] shadow-glow">
              <EpisodeArtwork src={episode.image || episode.feedImage} title={episode.title} />
            </div>
            <div className="min-w-0">
              <Link to={`/podcast/${episode.feedId || ''}`} className="text-xs font-semibold text-slate-400 transition hover:text-amber-100">
                返回播客
              </Link>
              <h1 className="mt-1 line-clamp-2 font-sans text-2xl font-semibold leading-snug tracking-[-.02em] text-slate-50 sm:text-3xl">
                {episode.title}
              </h1>
              {episode.feedTitle && <p className="mt-1 truncate text-sm text-slate-400">{episode.feedTitle}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {episode.duration && <span className="studio-chip">{formatDuration(episode.duration)}</span>}
            {episode.datePublished && <span className="studio-chip">{formatDate(episode.datePublished)}</span>}
            <span className={`studio-chip ${hasTranscript ? '!border-emerald-300/30 !bg-emerald-300/10 !text-emerald-200' : '!border-white/10 !text-slate-500'}`}>
              {hasTranscript ? '字幕可用' : '暂无字幕'}
            </span>
          </div>
        </div>
      </header>

      {user ? (
        <Transcript
          cues={cues}
          currentTime={state.currentTime}
          activeCueIndex={state.activeCueIndex}
          onCueClick={seekToCue}
          loading={loadingTranscript}
          status={transcriptStatus}
          source={transcriptSource}
          error={transcriptError}
          job={transcriptJob}
          transcriptId={transcriptId || undefined}
          episodeId={episode.id}
          episodeTitle={episode.title}
          podcastTitle={episode.feedTitle}
          hasRemoteTranscript={hasRemoteTranscript}
          reservePracticeControls
          onImportTranscript={importCurrentTranscript}
          onCreateJob={() => createTranscriptJob()}
          onRefresh={refreshTranscript}
        />
      ) : (
        <LockedTranscriptPanel />
      )}

      <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-7xl -translate-x-1/2 sm:w-[calc(100%-3rem)]">
        <EpisodeAudioControls
          showShadowControls={!!user}
          playbackRate={state.playbackRate}
          activeStart={activeCue?.startTime}
          activeEnd={activeCue?.endTime}
          onRateChange={setRate}
          onPrevCue={prevCue}
          onNextCue={nextCue}
          onRepeatCue={repeatActiveCue}
          onLoopChange={setLoopCurrentCue}
        />
      </div>
    </div>
  )
}
