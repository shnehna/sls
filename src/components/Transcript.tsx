import { useEffect, useMemo, useRef } from 'react'
import type { TranscriptCue, TranscriptJob } from '../api/types'
import { formatTime } from '../utils/format'
import SpeakerLabel from './SpeakerLabel'

interface Props {
  cues: TranscriptCue[]
  currentTime: number
  activeCueIndex: number
  onCueClick: (index: number) => void
  loading?: boolean
  status?: 'idle' | 'loading' | 'missing' | 'processing' | 'ready' | 'error'
  source?: 'stored' | 'remote-fallback' | 'none'
  error?: string | null
  job?: TranscriptJob | null
  hasRemoteTranscript?: boolean
  onImportTranscript?: () => void
  onCreateJob?: () => void
  onRefresh?: () => void
}

export default function Transcript({
  cues,
  currentTime,
  activeCueIndex,
  onCueClick,
  loading,
  status = 'idle',
  source = 'none',
  error,
  job,
  hasRemoteTranscript,
  onImportTranscript,
  onCreateJob,
  onRefresh,
}: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const speakers = useMemo(
    () => Array.from(new Set(cues.map((cue) => cue.speaker).filter((speaker): speaker is string => Boolean(speaker)))),
    [cues]
  )

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeCueIndex])

  if (loading || status === 'loading') {
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

  if (status === 'processing') {
    return (
      <section className="studio-transcript-surface p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-aurora-300/30 bg-aurora-300/10 text-2xl text-aurora-300">↻</div>
        <h3 className="font-display text-2xl font-bold tracking-[-.04em] text-paper-900">Generating synced transcript</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-paper-700/75">
          {job ? `Backend STT provider ${job.provider} is ${job.status.replace(/_/g, ' ')}. This view refreshes automatically.` : 'Backend STT is generating cues from the episode audio.'}
        </p>
        {job && <p className="mt-3 font-mono text-[11px] uppercase tracking-[.12em] text-paper-700/50">Job {job.id}</p>}
        {onRefresh && (
          <button onClick={onRefresh} className="mt-5 rounded-full border border-paper-700/15 bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">
            Refresh status
          </button>
        )}
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="studio-transcript-surface p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-danger/30 bg-danger/10 text-2xl text-danger">!</div>
        <h3 className="font-display text-2xl font-bold tracking-[-.04em] text-paper-900">Transcript unavailable</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-paper-700/75">
          {error || 'The transcript could not be loaded or generated.'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {onRefresh && <button onClick={onRefresh} className="rounded-full border border-paper-700/15 px-4 py-2 text-sm font-semibold text-paper-800">Retry</button>}
          {hasRemoteTranscript && onImportTranscript && <button onClick={onImportTranscript} className="rounded-full bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50">Import remote transcript</button>}
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
          {hasRemoteTranscript
            ? 'This episode has remote transcript metadata. Import it to parse and store reusable reading cues.'
            : 'This episode can still be played. Generate a synced transcript from the episode audio.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {hasRemoteTranscript && onImportTranscript && (
            <button onClick={onImportTranscript} className="rounded-full bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">
              Import transcript
            </button>
          )}
          {!hasRemoteTranscript && onCreateJob && (
            <button onClick={onCreateJob} className="rounded-full bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">
              Generate transcript
            </button>
          )}
          {onRefresh && <button onClick={onRefresh} className="rounded-full border border-paper-700/15 px-4 py-2 text-sm font-semibold text-paper-800">Refresh</button>}
        </div>
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
            {source === 'stored' && <span className="speaker-badge">stored</span>}
            {source === 'remote-fallback' && <span className="speaker-badge">remote preview</span>}
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
