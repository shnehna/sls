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
    <section className="studio-panel p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="studio-eyebrow">Practice controls</p>
              <h2 className="studio-title mt-1 text-xl">Repeat one line at a time</h2>
            </div>
            {activeStart !== undefined && activeEnd !== undefined && (
              <span className="text-sm text-slate-500">
                {formatTime(activeStart)} — {formatTime(activeEnd)}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <button onClick={onPrevCue} className="studio-button-ghost">Previous</button>
            <button onClick={onRepeatCue} className="studio-button-primary">Repeat</button>
            <button onClick={onNextCue} className="studio-button-ghost">Next</button>
            <button
              onClick={() => setLoopCue((value) => !value)}
              className={loopCue ? 'studio-button-primary' : 'studio-button-ghost'}
              aria-pressed={loopCue}
            >
              {loopCue ? 'Loop on' : 'Loop cue'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Speed</span>
            <span className="text-sm text-slate-500">{playbackRate.toFixed(2)}×</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => onRateChange(rate)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  playbackRate === rate
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
