import { useEffect, useMemo, useRef } from 'react'
import type { TranscriptCue } from '../api/types'
import { formatTime } from '../utils/format'
import SpeakerLabel from './SpeakerLabel'

interface Props {
  cues: TranscriptCue[]
  currentTime: number
  activeCueIndex: number
  onCueClick: (index: number) => void
  loading?: boolean
}

export default function Transcript({ cues, currentTime, activeCueIndex, onCueClick, loading }: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const speakers = useMemo(
    () => Array.from(new Set(cues.map((cue) => cue.speaker).filter((speaker): speaker is string => Boolean(speaker)))),
    [cues]
  )

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeCueIndex])

  if (loading) {
    return (
      <section className="studio-transcript-surface p-5">
        <div className="flex items-center gap-3 text-sm text-paper-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-ember-400 border-t-transparent" />
          Loading transcript…
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-paper-100/70" />
          ))}
        </div>
      </section>
    )
  }

  if (cues.length === 0) {
    return (
      <section className="studio-transcript-surface p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-paper-300/25 bg-white/40 text-2xl text-paper-300">♪</div>
        <h3 className="font-display text-2xl font-bold tracking-[-.04em] text-paper-900">No synced transcript found</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-paper-700/75">
          This episode can still be played, but shadow-reading cues need a Podcasting 2.0 transcript in SRT, VTT, or JSON.
        </p>
      </section>
    )
  }

  return (
    <section className="studio-transcript-surface flex min-h-[70vh] flex-col lg:h-[calc(100vh-8rem)]">
      <header className="sticky top-0 z-10 border-b border-paper-700/10 bg-paper-50/82 px-5 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-paper-300">Transcript</p>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-[-.04em] text-paper-900">Follow along</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {speakers.slice(0, 4).map((speaker) => <SpeakerLabel key={speaker} name={speaker} />)}
            <span className="speaker-badge">{cues.length} cues</span>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-5">
        {cues.map((cue, index) => {
          const active = index === activeCueIndex
          const played = currentTime > cue.endTime
          return (
            <button
              key={`${cue.startTime}-${index}`}
              ref={active ? activeRef : null}
              onClick={() => onCueClick(index)}
              className={`transcript-cue w-full ${active ? 'active' : ''} ${played ? 'played' : ''}`}
            >
              <div className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-5">
                <span className={`pt-1 font-mono text-[11px] tabular-nums ${active ? 'text-ember-600' : 'text-paper-700/42'}`}>
                  {formatTime(cue.startTime)}
                </span>
                <div className="min-w-0">
                  {cue.speaker && <SpeakerLabel name={cue.speaker} />}
                  <p className={`mt-2 text-base leading-8 sm:text-lg ${active ? 'font-semibold text-paper-900' : 'text-paper-900/74'}`}>
                    {cue.text}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
