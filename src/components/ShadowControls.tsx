import { useEffect, useState } from 'react'
import { formatTime } from '../utils/format'

interface Props {
  playbackRate: number
  activeStart?: number
  activeEnd?: number
  onRateChange: (rate: number) => void
  onPrevCue: () => void
  onNextCue: () => void
  onRepeatCue: () => void
  onLoopChange?: (enabled: boolean) => void
}

const RATES = [0.65, 0.8, 1, 1.15, 1.35]

export default function ShadowControls({
  playbackRate,
  activeStart,
  activeEnd,
  onRateChange,
  onPrevCue,
  onNextCue,
  onRepeatCue,
  onLoopChange,
}: Props) {
  const [loopCue, setLoopCue] = useState(false)

  useEffect(() => {
    onLoopChange?.(loopCue)
  }, [loopCue, onLoopChange])

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="studio-eyebrow">Practice</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-[-.04em] text-slate-50">Repeat the line</h2>
        </div>
        {activeStart !== undefined && activeEnd !== undefined && (
          <span className="rounded-full border border-ember-300/20 bg-ember-300/10 px-3 py-1 font-mono text-[11px] text-ember-200">
            {formatTime(activeStart)}–{formatTime(activeEnd)}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={onPrevCue} className="studio-button-ghost !px-3 !py-3" aria-label="Previous cue">
          ←
          <span className="ml-1 hidden sm:inline lg:hidden xl:inline">Prev</span>
        </button>
        <button onClick={onRepeatCue} className="studio-button-primary col-span-1 !px-3 !py-3" aria-label="Repeat cue">
          Repeat
        </button>
        <button onClick={onNextCue} className="studio-button-ghost !px-3 !py-3" aria-label="Next cue">
          <span className="mr-1 hidden sm:inline lg:hidden xl:inline">Next</span>
          →
        </button>
      </div>

      <button
        onClick={() => setLoopCue((value) => !value)}
        className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
          loopCue
            ? 'border-ember-300/40 bg-ember-300/15 text-ember-100 shadow-ember'
            : 'border-white/10 bg-ink-950/40 text-slate-300 hover:border-aurora-300/30 hover:bg-aurora-300/10 hover:text-white'
        }`}
        aria-pressed={loopCue}
      >
        <span>{loopCue ? 'Looping current cue' : 'Loop current cue'}</span>
        <span className={`h-5 w-9 rounded-full p-0.5 transition ${loopCue ? 'bg-ember-300' : 'bg-slate-700'}`}>
          <span className={`block h-4 w-4 rounded-full bg-white transition ${loopCue ? 'translate-x-4' : ''}`} />
        </span>
      </button>

      <div className="mt-4 rounded-2xl border border-white/10 bg-ink-950/45 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[.16em] text-slate-400">Speed</span>
          <span className="font-mono text-xs text-aurora-200">{playbackRate.toFixed(2)}×</span>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {RATES.map((rate) => (
            <button
              key={rate}
              onClick={() => onRateChange(rate)}
              className={`rounded-lg border px-2 py-2 font-mono text-[11px] font-medium transition ${
                playbackRate === rate
                  ? 'border-aurora-300/40 bg-aurora-300/20 text-aurora-100 shadow-glow'
                  : 'border-white/10 bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-slate-100'
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
