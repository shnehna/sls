import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import type { Episode, PlayerState, PlayerAction, TranscriptCue } from '../api/types'
import { parseTranscript, findActiveCueIndex } from '../utils/transcript'
import { fetchTranscriptFile } from '../api/client'

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

interface PlayerContextValue {
  state: PlayerState
  audioRef: React.RefObject<HTMLAudioElement>
  cues: TranscriptCue[]
  loadingTranscript: boolean
  dispatch: React.Dispatch<PlayerAction>
  loadEpisode: (episode: Episode) => void
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

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState)
  const [cues, setCues] = React.useState<TranscriptCue[]>([])
  const [loadingTranscript, setLoadingTranscript] = React.useState(false)
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

  // Load transcript when episode changes
  useEffect(() => {
    if (!state.episode) {
      setCues([])
      return
    }

    const ep = state.episode
    const transcript =
      ep.transcripts && ep.transcripts.length > 0
        ? ep.transcripts[0]
        : ep.transcriptUrl
          ? { url: ep.transcriptUrl, type: 'application/srt' as const }
          : null

    if (!transcript) {
      setCues([])
      return
    }

    setLoadingTranscript(true)
    fetchTranscriptFile(transcript.url)
      .then((raw) => {
        const parsed = parseTranscript(raw, transcript.type, ep.persons)
        setCues(parsed)
        setLoadingTranscript(false)
      })
      .catch((err) => {
        console.error('Failed to load transcript:', err)
        setCues([])
        setLoadingTranscript(false)
      })
  }, [state.episode])

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
  }, [])

  const value: PlayerContextValue = {
    state,
    audioRef,
    cues,
    loadingTranscript,
    dispatch,
    loadEpisode,
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
