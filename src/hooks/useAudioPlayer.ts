import { usePlayer } from '../context/PlayerContext'

/**
 * Small convenience wrapper around PlayerContext for components that only need
 * playback controls. Kept separate so player-centric UI remains easy to test.
 */
export function useAudioPlayer() {
  const player = usePlayer()

  return {
    episode: player.state.episode,
    isPlaying: player.state.isPlaying,
    currentTime: player.state.currentTime,
    duration: player.state.duration,
    playbackRate: player.state.playbackRate,
    volume: player.state.volume,
    activeCueIndex: player.state.activeCueIndex,
    cues: player.cues,
    loadingTranscript: player.loadingTranscript,
    play: player.play,
    pause: player.pause,
    togglePlay: player.togglePlay,
    seek: player.seek,
    setRate: player.setRate,
    setVolume: player.setVolume,
    seekToCue: player.seekToCue,
    nextCue: player.nextCue,
    prevCue: player.prevCue,
    loadEpisode: player.loadEpisode,
  }
}
