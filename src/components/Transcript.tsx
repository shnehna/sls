import { useEffect, useMemo, useRef } from 'react'
import { ArrowsClockwise, MusicNote, WarningCircle } from '@phosphor-icons/react'
import type { TranscriptCue, TranscriptJob } from '../api/types'
import { formatTime } from '../utils/format'
import BookmarkCueButton from './BookmarkCueButton'
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
  transcriptId?: string
  episodeId?: number
  episodeTitle?: string
  podcastTitle?: string
  hasRemoteTranscript?: boolean
  reservePracticeControls?: boolean
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
  transcriptId,
  episodeId,
  episodeTitle,
  podcastTitle,
  hasRemoteTranscript,
  reservePracticeControls = false,
  onImportTranscript,
  onCreateJob,
  onRefresh,
}: Props) {
  const activeRef = useRef<HTMLDivElement | null>(null)
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
          正在加载字幕...
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
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-ember-300/30 bg-ember-300/10 text-2xl text-ember-500">
          <ArrowsClockwise weight="bold" aria-hidden="true" />
        </div>
        <h3 className="font-sans text-2xl font-semibold tracking-[-.02em] text-paper-900">正在生成同步字幕</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-paper-700/75">
          {job ? `后端语音识别服务 ${job.provider} 正在${job.status.replace(/_/g, ' ')}。页面会自动刷新。` : '后端语音识别正在从音频生成逐句字幕。'}
        </p>
        {job && <p className="mt-3 font-mono text-[11px] uppercase tracking-[.12em] text-paper-700/50">Job {job.id}</p>}
        {onRefresh && (
          <button onClick={onRefresh} className="mt-5 rounded-full border border-paper-700/15 bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">
            刷新状态
          </button>
        )}
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="studio-transcript-surface p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-danger/30 bg-danger/10 text-2xl text-danger">
          <WarningCircle weight="bold" aria-hidden="true" />
        </div>
        <h3 className="font-sans text-2xl font-semibold tracking-[-.02em] text-paper-900">字幕暂不可用</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-paper-700/75">
          {error || '字幕无法加载或生成。'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {onRefresh && <button onClick={onRefresh} className="rounded-full border border-paper-700/15 px-4 py-2 text-sm font-semibold text-paper-800">重试</button>}
          {hasRemoteTranscript && onImportTranscript && <button onClick={onImportTranscript} className="rounded-full bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50">导入远程字幕</button>}
        </div>
      </section>
    )
  }

  if (cues.length === 0) {
    return (
      <section className="studio-transcript-surface p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-paper-300/25 bg-white/40 text-2xl text-paper-300">
          <MusicNote weight="fill" aria-hidden="true" />
        </div>
        <h3 className="font-sans text-2xl font-semibold tracking-[-.02em] text-paper-900">没有找到同步字幕</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-paper-700/75">
          {hasRemoteTranscript
            ? '这一集有远程字幕信息。导入后可以解析并保存为可重复练习的句子。'
            : '这一集仍然可以播放。你也可以从音频生成同步字幕。'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {hasRemoteTranscript && onImportTranscript && (
            <button onClick={onImportTranscript} className="rounded-full bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">
              导入字幕
            </button>
          )}
          {!hasRemoteTranscript && onCreateJob && (
            <button onClick={onCreateJob} className="rounded-full bg-paper-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">
              生成字幕
            </button>
          )}
          {onRefresh && <button onClick={onRefresh} className="rounded-full border border-paper-700/15 px-4 py-2 text-sm font-semibold text-paper-800">刷新</button>}
        </div>
      </section>
    )
  }

  const transcriptHeightClass = reservePracticeControls
    ? 'h-[calc(100dvh-38rem)] min-h-[12rem] lg:h-[calc(100dvh-26rem)] lg:min-h-0'
    : 'h-[calc(100dvh-30rem)] min-h-[14rem] lg:h-[calc(100dvh-26rem)] lg:min-h-0'

  return (
    <section className={`studio-transcript-surface flex flex-col ${transcriptHeightClass}`}>
      <header className="sticky top-0 z-10 border-b border-paper-700/10 bg-paper-50/88 px-5 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-paper-900">字幕练习</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {source === 'stored' && <span className="speaker-badge">已保存</span>}
            {source === 'remote-fallback' && <span className="speaker-badge">远程预览</span>}
            {speakers.slice(0, 4).map((speaker) => <SpeakerLabel key={speaker} name={speaker} />)}
            <span className="speaker-badge">{cues.length} 句</span>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-5">
        {cues.map((cue, index) => {
          const active = index === activeCueIndex
          const played = currentTime > cue.endTime
          return (
            <div
              key={`${cue.startTime}-${index}`}
              ref={active ? activeRef : null}
              className={`transcript-cue w-full ${active ? 'active' : ''} ${played ? 'played' : ''}`}
            >
              <div className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-5">
                <button
                  type="button"
                  onClick={() => onCueClick(index)}
                  className={`pt-1 text-left font-mono text-[11px] tabular-nums ${active ? 'text-ember-600' : 'text-paper-700/42'}`}
                >
                  {formatTime(cue.startTime)}
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {cue.speaker && <SpeakerLabel name={cue.speaker} />}
                    {episodeId && (
                      <BookmarkCueButton
                        episodeId={episodeId}
                        transcriptId={transcriptId}
                        cueIndex={index}
                        cueText={cue.text}
                        cueStartTime={cue.startTime}
                        cueEndTime={cue.endTime}
                        episodeTitle={episodeTitle}
                        podcastTitle={podcastTitle}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onCueClick(index)}
                    className={`mt-2 block w-full text-left text-base leading-8 sm:text-lg ${active ? 'font-semibold text-paper-900' : 'text-paper-900/74'}`}
                  >
                    {cue.text}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
