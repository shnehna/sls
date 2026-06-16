import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { saveEpisodeProgress } from '../api/library'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { formatTime } from '../utils/format'

interface Props {
  compact?: boolean
}

function PlayerArtwork({ src, title, compact }: { src?: string; title: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false)
  const size = compact ? 'h-20 w-20' : 'h-12 w-12 sm:h-14 sm:w-14'

  return (
    <div className={`${size} flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-glow`}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          aria-label={title}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-ink-800/80 text-2xl text-ember-300">♪</div>
      )}
    </div>
  )
}

export default function AudioPlayer({ compact = false }: Props) {
  const { user } = useAuth()
  const { state, audioRef, togglePlay, seek, setRate, setVolume, dispatch } = usePlayer()
  const lastProgressSaveRef = useRef(0)
  const episode = state.episode

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !episode) return

    audio.currentTime = state.currentTime
    audio.playbackRate = state.playbackRate
    audio.volume = state.volume
    if (state.isPlaying) audio.play().catch(() => dispatch({ type: 'PAUSE' }))
  }, [audioRef, dispatch, episode?.enclosureUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const saveProgress = () => {
      if (!user || !episode || audio.currentTime < 1) return
      const now = Date.now()
      if (now - lastProgressSaveRef.current < 10000) return
      lastProgressSaveRef.current = now
      void saveEpisodeProgress(episode.id, {
        podcastId: episode.feedId,
        positionSeconds: audio.currentTime,
        durationSeconds: audio.duration || episode.duration,
        episodeTitle: episode.title,
        episodeImage: episode.image || episode.feedImage,
        podcastTitle: episode.feedTitle,
        podcastImage: episode.feedImage,
      }).catch(() => undefined)
    }

    const onLoadedMetadata = () => dispatch({ type: 'SET_DURATION', duration: audio.duration || episode?.duration || 0 })
    const onTimeUpdate = () => {
      dispatch({ type: 'SET_TIME', time: audio.currentTime })
      saveProgress()
    }
    const onEnded = () => {
      dispatch({ type: 'PAUSE' })
      saveProgress()
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioRef, dispatch, episode, user])

  if (!episode) return null

  const duration = state.duration || episode.duration || 0
  const progress = duration ? (state.currentTime / duration) * 100 : 0
  const artwork = episode.image || episode.feedImage

  const seekFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    seek(Math.max(0, Math.min(duration, ratio * duration)))
  }

  const playButtonClass = compact
    ? 'grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-ember-300 text-ink-950 shadow-ember transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-ember-300 focus:ring-offset-2 focus:ring-offset-ink-950'
    : 'grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-ember-300 text-ink-950 shadow-ember transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-ember-300 focus:ring-offset-2 focus:ring-offset-ink-950'

  const playerBody = (
    <>
      <audio ref={audioRef} src={episode.enclosureUrl} preload="metadata" />

      <div className={compact ? 'space-y-5' : 'flex items-center gap-3 sm:gap-4'}>
        {!compact && <PlayerArtwork src={artwork} title={episode.title} />}

        <button onClick={togglePlay} className={playButtonClass} aria-label={state.isPlaying ? '暂停' : '播放'}>
          {state.isPlaying ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4Zm7 0h3v12h-3V4Z" /></svg>
          ) : (
            <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 3.9v12.2c0 .8.9 1.3 1.6.9l9.2-6.1c.6-.4.6-1.4 0-1.8L7.9 3c-.7-.4-1.6.1-1.6.9Z" /></svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className={compact ? 'flex items-start gap-4' : 'flex items-center justify-between gap-3'}>
            {compact && <PlayerArtwork src={artwork} title={episode.title} compact />}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-aurora-300">正在播放</p>
              <h3 className={`${compact ? 'mt-2 line-clamp-3 font-display text-2xl font-bold leading-tight tracking-[-.04em]' : 'mt-1 truncate text-sm font-semibold sm:text-base'} text-slate-50`}>
                {episode.title}
              </h3>
              {compact && episode.feedTitle && <p className="mt-2 truncate text-sm text-slate-400">{episode.feedTitle}</p>}
            </div>
          </div>

          <div className={compact ? 'mt-5' : 'mt-3'}>
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div
              className="studio-scrubber"
              onClick={seekFromPointer}
              role="slider"
              aria-label="调整播放位置"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={state.currentTime}
            >
              <div className="studio-scrubber-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className={compact ? 'grid grid-cols-[1fr_auto] items-center gap-3' : 'hidden items-center gap-3 sm:flex'}>
          <label className="sr-only" htmlFor={compact ? 'episode-playback-rate' : 'playback-rate'}>播放速度</label>
          <select
            id={compact ? 'episode-playback-rate' : 'playback-rate'}
            value={state.playbackRate}
            onChange={(event) => setRate(Number(event.target.value))}
            className="rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-aurora-300 focus:ring-2 focus:ring-aurora-300/20"
            aria-label="播放速度"
          >
            {[0.65, 0.8, 1, 1.15, 1.35, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
          </select>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className={`${compact ? 'w-full' : 'w-20'} accent-ember-300`}
            aria-label="音量"
          />
        </div>
      </div>
    </>
  )

  if (compact) {
    return <div className="rounded-2xl border border-white/10 bg-ink-950/45 p-4">{playerBody}</div>
  }

  return <div className="studio-command-bar animate-float-in">{playerBody}</div>
}
