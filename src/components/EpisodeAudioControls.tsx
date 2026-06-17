import AudioPlayer from './AudioPlayer'
import ShadowControls from './ShadowControls'

interface Props {
  showShadowControls: boolean
  playbackRate: number
  activeStart?: number
  activeEnd?: number
  onRateChange: (rate: number) => void
  onPrevCue: () => void
  onNextCue: () => void
  onRepeatCue: () => void
  onLoopChange?: (enabled: boolean) => void
}

export default function EpisodeAudioControls({
  showShadowControls,
  playbackRate,
  activeStart,
  activeEnd,
  onRateChange,
  onPrevCue,
  onNextCue,
  onRepeatCue,
  onLoopChange,
}: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-950/45 p-4 shadow-sm">
      <AudioPlayer compact embedded hideRateControl minimal />

      {showShadowControls && (
        <>
          <div className="my-4 h-px bg-white/10" />
          <ShadowControls
            embedded
            playbackRate={playbackRate}
            activeStart={activeStart}
            activeEnd={activeEnd}
            onRateChange={onRateChange}
            onPrevCue={onPrevCue}
            onNextCue={onNextCue}
            onRepeatCue={onRepeatCue}
            onLoopChange={onLoopChange}
          />
        </>
      )}
    </section>
  )
}
