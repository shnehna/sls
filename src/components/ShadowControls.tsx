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
  embedded?: boolean
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
  embedded = false,
}: Props) {
  const [loopCue, setLoopCue] = useState(false)

  useEffect(() => {
    onLoopChange?.(loopCue)
  }, [loopCue, onLoopChange])

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`${embedded ? 'text-base' : 'text-2xl'} font-semibold text-slate-50`}>
            逐句练习
          </h2>
        </div>
        {activeStart !== undefined && activeEnd !== undefined && (
          <span className="rounded-full border border-ember-300/20 bg-ember-300/10 px-3 py-1 font-mono text-[11px] text-ember-200">
            {formatTime(activeStart)}-{formatTime(activeEnd)}
          </span>
        )}
      </div>

      <div className={`${embedded ? 'mt-3' : 'mt-4'} grid grid-cols-3 gap-2`}>
        <button onClick={onPrevCue} className="studio-button-ghost !px-3 !py-3" aria-label="上一句">
          上一句
        </button>
        <button onClick={onRepeatCue} className="studio-button-primary col-span-1 !px-3 !py-3" aria-label="重复当前句">
          重复
        </button>
        <button onClick={onNextCue} className="studio-button-ghost !px-3 !py-3" aria-label="下一句">
          下一句
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[.9fr_1.35fr]">
        <button
          onClick={() => setLoopCue((value) => !value)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
            loopCue
              ? 'border-ember-300/40 bg-ember-300/15 text-ember-100 shadow-ember'
              : 'border-white/10 bg-ink-950/40 text-slate-300 hover:border-ember-300/30 hover:bg-ember-300/10 hover:text-white'
          }`}
          aria-pressed={loopCue}
        >
          <span>{loopCue ? '循环中' : '循环当前句'}</span>
          <span className={`h-5 w-9 rounded-full p-0.5 transition ${loopCue ? 'bg-ember-300' : 'bg-slate-700'}`}>
            <span className={`block h-4 w-4 rounded-full bg-white transition ${loopCue ? 'translate-x-4' : ''}`} />
          </span>
        </button>

        <div className="rounded-xl border border-white/10 bg-ink-950/45 p-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[.16em] text-slate-400">速度</span>
            <span className="font-mono text-xs text-amber-100">{playbackRate.toFixed(2)}×</span>
          </div>

          <select
            value={playbackRate}
            onChange={(event) => onRateChange(Number(event.target.value))}
            className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-2 py-2 font-mono text-xs text-slate-100 outline-none focus:border-ember-300 sm:hidden"
            aria-label="播放速度"
          >
            {RATES.map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
          </select>

          <div className="mt-3 hidden grid-cols-5 gap-1.5 sm:grid">
            {RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => onRateChange(rate)}
                className={`rounded-lg border px-2 py-2 font-mono text-[11px] font-medium transition ${
                  playbackRate === rate
                    ? 'border-ember-300/40 bg-ember-300/18 text-amber-100 shadow-glow'
                    : 'border-white/10 bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-slate-100'
                }`}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  if (embedded) {
    return <div className="space-y-3">{content}</div>
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
      {content}
    </section>
  )
}
