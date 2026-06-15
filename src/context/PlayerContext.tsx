import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import type { Episode, PlayerState, PlayerAction, Transcript, TranscriptCue, TranscriptJob } from '../api/types'
import { parseTranscript, findActiveCueIndex } from '../utils/transcript'
import {
  createTranscriptionJob as createTranscriptionJobRequest,
  fetchTranscriptFile,
  getEpisodeTranscript,
  importEpisodeTranscript,
} from '../api/client'

// ==================== Initial State ====================

const initialState: PlayerState = {
  episode: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  activeCueIndex: -1,
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_EPISODE':
      return { ...initialState, episode: action.episode, volume: state.volume, playbackRate: state.playbackRate }
    case 'PLAY':
      return { ...state, isPlaying: true }
    case 'PAUSE':
      return { ...state, isPlaying: false }
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying }
    case 'SET_TIME':
      return { ...state, currentTime: action.time }
    case 'SET_DURATION':
      return { ...state, duration: action.duration }
    case 'SET_RATE':
      return { ...state, playbackRate: action.rate }
    case 'SET_VOLUME':
      return { ...state, volume: action.volume }
    case 'SET_ACTIVE_CUE':
      return { ...state, activeCueIndex: action.index }
    case 'CLEAR':
      return { ...initialState, volume: state.volume, playbackRate: state.playbackRate }
    default:
      return state
  }
}

// ==================== Context ====================

type TranscriptStatus = 'idle' | 'loading' | 'missing' | 'processing' | 'ready' | 'error'
type TranscriptSource = 'stored' | 'remote-fallback' | 'none'

interface PlayerContextValue {
  state: PlayerState
  audioRef: React.RefObject<HTMLAudioElement>
  cues: TranscriptCue[]
  loadingTranscript: boolean
  transcriptStatus: TranscriptStatus
  transcriptSource: TranscriptSource
  transcriptError: string | null
  transcriptJob: TranscriptJob | null
  hasRemoteTranscript: boolean
  dispatch: React.Dispatch<PlayerAction>
  loadEpisode: (episode: Episode) => void
  refreshTranscript: () => Promise<void>
  importCurrentTranscript: () => Promise<void>
  createTranscriptJob: (provider?: string) => Promise<void>
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setRate: (rate: number) => void
  setVolume: (vol: number) => void
  seekToCue: (index: number) => void
  nextCue: () => void
  prevCue: () => void
  clearPlayer: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

function getRemoteTranscript(episode: Episode): Transcript | null {
  if (episode.transcripts && episode.transcripts.length > 0) return episode.transcripts[0]!
  if (episode.transcriptUrl) return { url: episode.transcriptUrl, type: 'application/srt' }
  return null
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState)
  const [cues, setCues] = React.useState<TranscriptCue[]>([])
  const [loadingTranscript, setLoadingTranscript] = React.useState(false)
  const [transcriptStatus, setTranscriptStatus] = React.useState<TranscriptStatus>('idle')
  const [transcriptSource, setTranscriptSource] = React.useState<TranscriptSource>('none')
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null)
  const [transcriptJob, setTranscriptJob] = React.useState<TranscriptJob | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Sync audio element state
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (state.isPlaying) {
      audio.play().catch(() => {
        dispatch({ type: 'PAUSE' })
      })
    } else {
      audio.pause()
    }
  }, [state.isPlaying, state.episode])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackRate
    }
  }, [state.playbackRate])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume
    }
  }, [state.volume])

  const loadRemoteTranscript = useCallback(async (episode: Episode, remote: Transcript): Promise<boolean> => {
    try {
      const raw = await fetchTranscriptFile(remote.url)
      const parsed = parseTranscript(raw, remote.type, episode.persons)
      setCues(parsed)
      setTranscriptStatus(parsed.length > 0 ? 'ready' : 'missing')
      setTranscriptSource(parsed.length > 0 ? 'remote-fallback' : 'none')
      return parsed.length > 0
    } catch (err) {
      console.error('Failed to load remote transcript:', err)
      return false
    }
  }, [])

  const loadTranscriptForEpisode = useCallback(async (episode: Episode, options?: { forceRefresh?: boolean; silent?: boolean }) => {
    const remote = getRemoteTranscript(episode)
    if (!options?.silent) {
      setLoadingTranscript(true)
      setTranscriptStatus('loading')
      setTranscriptSource('none')
      setTranscriptError(null)
      setTranscriptJob(null)
    }

    try {
      const stored = await getEpisodeTranscript(
        episode.id,
        options?.forceRefresh ? { forceRefresh: true } : undefined
      )

      if (stored.status === 'ready' && stored.cues.length > 0) {
        setCues(stored.cues)
        setTranscriptStatus('ready')
        setTranscriptSource('stored')
        setTranscriptJob(null)
        return
      }

      if (stored.status === 'processing') {
        setCues([])
        setTranscriptStatus('processing')
        setTranscriptSource('none')
        setTranscriptJob(stored.job || null)
        return
      }

      if (stored.status === 'failed') {
        setCues([])
        setTranscriptStatus('error')
        setTranscriptSource('none')
        setTranscriptError(stored.errorMessage || 'Transcript processing failed')
        setTranscriptJob(stored.job || null)
        return
      }
    } catch (err) {
      // Keep the player usable in Vite dev or when D1 is not configured.
      console.warn('Stored transcript API unavailable; falling back to remote transcript:', err)
    }

    if (remote) {
      const loaded = await loadRemoteTranscript(episode, remote)
      if (loaded) return
    }

    setCues([])
    setTranscriptStatus('missing')
    setTranscriptSource('none')
  }, [loadRemoteTranscript])

  // Load transcript when episode changes
  useEffect(() => {
    if (!state.episode) {
      setCues([])
      setTranscriptStatus('idle')
      setTranscriptSource('none')
      setTranscriptError(null)
      setTranscriptJob(null)
      return
    }

    let cancelled = false
    setLoadingTranscript(true)
    loadTranscriptForEpisode(state.episode)
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load transcript:', err)
        setCues([])
        setTranscriptStatus('error')
        setTranscriptSource('none')
        setTranscriptError(err instanceof Error ? err.message : 'Failed to load transcript')
      })
      .finally(() => {
        if (!cancelled) setLoadingTranscript(false)
      })

    return () => {
      cancelled = true
    }
  }, [state.episode, loadTranscriptForEpisode])

  // Sync active cue with current time
  useEffect(() => {
    if (cues.length === 0) return
    const idx = findActiveCueIndex(cues, state.currentTime)
    if (idx !== state.activeCueIndex) {
      dispatch({ type: 'SET_ACTIVE_CUE', index: idx })
    }
  }, [state.currentTime, cues, state.activeCueIndex])

  const loadEpisode = useCallback((episode: Episode) => {
    dispatch({ type: 'SET_EPISODE', episode })
  }, [])

  const refreshTranscript = useCallback(async () => {
    if (!state.episode) return
    setLoadingTranscript(true)
    try {
      await loadTranscriptForEpisode(state.episode, { forceRefresh: true })
    } finally {
      setLoadingTranscript(false)
    }
  }, [loadTranscriptForEpisode, state.episode])

  useEffect(() => {
    if (!state.episode || transcriptStatus !== 'processing') return

    const interval = window.setInterval(() => {
      loadTranscriptForEpisode(state.episode!, { forceRefresh: true, silent: true }).catch((err) => {
        console.warn('Failed to refresh transcript status:', err)
      })
    }, 6000)

    return () => window.clearInterval(interval)
  }, [loadTranscriptForEpisode, state.episode, transcriptStatus])

  const importCurrentTranscript = useCallback(async () => {
    if (!state.episode) return
    const remote = getRemoteTranscript(state.episode)
    if (!remote) {
      setTranscriptError('No remote transcript is available to import')
      setTranscriptStatus('error')
      return
    }

    setLoadingTranscript(true)
    setTranscriptError(null)
    try {
      await importEpisodeTranscript(state.episode.id, {
        url: remote.url,
        type: remote.type,
        audioUrl: state.episode.enclosureUrl,
        episodeGuid: state.episode.guid,
        sourceKind: 'podcast_index_remote',
      })
      await loadTranscriptForEpisode(state.episode, { forceRefresh: true })
    } catch (err) {
      setTranscriptStatus('error')
      setTranscriptError(err instanceof Error ? err.message : 'Failed to import transcript')
    } finally {
      setLoadingTranscript(false)
    }
  }, [loadTranscriptForEpisode, state.episode])

  const createTranscriptJob = useCallback(async (provider = 'auto') => {
    if (!state.episode) return
    setLoadingTranscript(true)
    setTranscriptError(null)
    try {
      const result = await createTranscriptionJobRequest(state.episode.id, {
        audioUrl: state.episode.enclosureUrl,
        episodeGuid: state.episode.guid,
        provider,
        language: state.episode.feedLanguage,
      })
      setCues([])
      setTranscriptJob(result.job)
      setTranscriptStatus('processing')
      setTranscriptSource('none')
    } catch (err) {
      setTranscriptStatus('error')
      setTranscriptError(err instanceof Error ? err.message : 'Failed to create transcription job')
    } finally {
      setLoadingTranscript(false)
    }
  }, [state.episode])

  const play = useCallback(() => dispatch({ type: 'PLAY' }), [])
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), [])
  const togglePlay = useCallback(() => dispatch({ type: 'TOGGLE_PLAY' }), [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
    dispatch({ type: 'SET_TIME', time })
  }, [])

  const setRate = useCallback((rate: number) => {
    dispatch({ type: 'SET_RATE', rate })
  }, [])

  const setVolume = useCallback((vol: number) => {
    dispatch({ type: 'SET_VOLUME', volume: vol })
  }, [])

  const seekToCue = useCallback((index: number) => {
    const cue = cues[index]
    if (cue) {
      seek(cue.startTime)
    }
  }, [cues, seek])

  const nextCue = useCallback(() => {
    const nextIdx = state.activeCueIndex + 1
    if (nextIdx < cues.length) {
      seekToCue(nextIdx)
    }
  }, [state.activeCueIndex, cues.length, seekToCue])

  const prevCue = useCallback(() => {
    const prevIdx = state.activeCueIndex - 1
    if (prevIdx >= 0) {
      seekToCue(prevIdx)
    } else if (cues.length > 0) {
      seekToCue(0)
    }
  }, [state.activeCueIndex, cues.length, seekToCue])

  const clearPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    dispatch({ type: 'CLEAR' })
    setCues([])
    setTranscriptStatus('idle')
    setTranscriptSource('none')
    setTranscriptError(null)
    setTranscriptJob(null)
  }, [])

  const hasRemoteTranscript = Boolean(state.episode && getRemoteTranscript(state.episode))

  const value: PlayerContextValue = {
    state,
    audioRef,
    cues,
    loadingTranscript,
    transcriptStatus,
    transcriptSource,
    transcriptError,
    transcriptJob,
    hasRemoteTranscript,
    dispatch,
    loadEpisode,
    refreshTranscript,
    importCurrentTranscript,
    createTranscriptJob,
    play,
    pause,
    togglePlay,
    seek,
    setRate,
    setVolume,
    seekToCue,
    nextCue,
    prevCue,
    clearPlayer,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return ctx
}
