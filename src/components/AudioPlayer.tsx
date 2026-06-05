import { useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { formatTime } from '../utils/format'

interface Props {
  compact?: boolean
}

export default function AudioPlayer({ compact = false }: Props) {
  const { state, audioRef, togglePlay, seek, setRate, setVolume, dispatch } = usePlayer()
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

    const onLoadedMetadata = () => dispatch({ type: 'SET_DURATION', duration: audio.duration || episode?.duration || 0 })
    const onTimeUpdate = () => dispatch({ type: 'SET_TIME', time: audio.currentTime })
    const onEnded = () => dispatch({ type: 'PAUSE' })

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioRef, dispatch, episode?.duration])

  if (!episode) return null

  const duration = state.duration || episode.duration || 0
  const progress = duration ? (state.currentTime / duration) * 100 : 0
  const wrapperClass = compact
    ? 'studio-panel p-4 sm:p-5'
    : 'fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur'

  return (
    <div className={wrapperClass}>
      <audio ref={audioRef} src={episode.enclosureUrl} preload="metadata" />

      <div className={compact ? 'space-y-4' : 'mx-auto max-w-6xl px-4 py-3'}>
        <div className={compact ? 'flex flex-col gap-4 sm:flex-row sm:items-center' : 'flex items-center gap-4'}>
          <button
            onClick={togglePlay}
            className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4Zm7 0h3v12h-3V4Z" /></svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 3.9v12.2c0 .8.9 1.3 1.6.9l9.2-6.1c.6-.4.6-1.4 0-1.8L7.9 3c-.7-.4-1.6.1-1.6.9Z" /></svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Now playing</p>
                <h3 className="mt-0.5 truncate text-base font-semibold text-slate-950">{episode.title}</h3>
              </div>
              <p className="hidden whitespace-nowrap text-xs text-slate-500 sm:block">{formatTime(state.currentTime)} / {formatTime(duration)}</p>
            </div>
            <div
              className="mt-3 h-2 cursor-pointer overflow-hidden rounded-full bg-slate-200"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const ratio = (event.clientX - rect.left) / rect.width
                seek(Math.max(0, Math.min(duration, ratio * duration)))
              }}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={state.currentTime}
            >
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="playback-rate">Playback speed</label>
            <select
              id="playback-rate"
              value={state.playbackRate}
              onChange={(event) => setRate(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Playback speed"
            >
              {[0.65, 0.8, 1, 1.15, 1.35, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
            </select>

            {!compact && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={state.volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-24 accent-blue-600"
                aria-label="Volume"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
