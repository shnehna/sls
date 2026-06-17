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
    <section className="rounded-console border border-white/10 bg-ink-950/92 p-3 shadow-panel backdrop-blur-2xl sm:p-4">
      <div className={showShadowControls ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start' : ''}>
        <AudioPlayer compact embedded hideRateControl minimal />

        {showShadowControls && (
          <div className="border-t border-white/10 pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
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
          </div>
        )}
      </div>
    </section>
  )
}
