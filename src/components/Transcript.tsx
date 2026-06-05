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
      <section className="studio-panel p-5">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          Loading transcript…
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (cues.length === 0) {
    return (
      <section className="studio-panel p-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl text-slate-400">♪</div>
        <h3 className="text-lg font-semibold text-slate-950">No synced transcript found</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          This episode can still be played, but shadow-reading cues need a Podcasting 2.0 transcript in SRT, VTT, or JSON.
        </p>
      </section>
    )
  }

  return (
    <section className="studio-panel overflow-hidden">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="studio-eyebrow">Transcript</p>
            <h2 className="studio-title mt-1 text-xl">Follow along</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {speakers.slice(0, 4).map((speaker) => <SpeakerLabel key={speaker} name={speaker} />)}
          </div>
        </div>
      </header>

      <div className="max-h-[64vh] space-y-1 overflow-y-auto p-3 sm:p-4">
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
              <div className="grid grid-cols-[4rem_1fr] gap-3 sm:gap-4">
                <span className="pt-1 text-xs tabular-nums text-slate-400">{formatTime(cue.startTime)}</span>
                <div className="min-w-0">
                  {cue.speaker && <SpeakerLabel name={cue.speaker} />}
                  <p className={`mt-2 text-base leading-7 ${active ? 'font-medium text-slate-950' : 'text-slate-700'}`}>
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
