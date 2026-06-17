import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getCachedEpisodeById, getEpisodeById } from '../api/client'
import type { Episode as EpisodeType } from '../api/types'
import EpisodeAudioControls from '../components/EpisodeAudioControls'
import LockedTranscriptPanel from '../components/LockedTranscriptPanel'
import Transcript from '../components/Transcript'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { formatDate, formatDuration, truncate } from '../utils/format'

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
    <div className="pb-10">
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="studio-practice-deck space-y-4">
          <Link to={`/podcast/${episode.feedId || ''}`} className="inline-flex items-center font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-slate-400 transition hover:text-ember-200">
            ← 返回播客
          </Link>

          <section className="flex gap-3">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] shadow-glow">
              <EpisodeArtwork src={episode.image || episode.feedImage} title={episode.title} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="studio-eyebrow">收听工作台</p>
              <h1 className="mt-2 line-clamp-4 font-display text-2xl font-bold leading-tight tracking-[-.045em] text-slate-50">
                {episode.title}
              </h1>
              {episode.feedTitle && <p className="mt-2 truncate text-sm text-slate-400">{episode.feedTitle}</p>}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {episode.duration && <span className="studio-chip">{formatDuration(episode.duration)}</span>}
            {episode.datePublished && <span className="studio-chip">{formatDate(episode.datePublished)}</span>}
            <span className={`studio-chip ${hasTranscript ? '!border-emerald-300/30 !bg-emerald-300/10 !text-emerald-200' : '!border-white/10 !text-slate-500'}`}>
              {hasTranscript ? '字幕可用' : '暂无字幕'}
            </span>
          </div>

          {episode.description && (
            <p className="line-clamp-3 text-xs leading-6 text-slate-400">{truncate(episode.description, 160)}</p>
          )}

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
        </aside>

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
            onImportTranscript={importCurrentTranscript}
            onCreateJob={() => createTranscriptJob()}
            onRefresh={refreshTranscript}
          />
        ) : (
          <LockedTranscriptPanel />
        )}
      </div>
    </div>
  )
}
