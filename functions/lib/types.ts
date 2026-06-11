import type {
  StoredTranscript,
  TranscriptCue,
  TranscriptJob,
} from '../../shared/types'

export interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  meta: unknown
  error?: string
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(columnName?: string): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run<T = unknown>(): Promise<D1Result<T>>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>
}

export interface Env {
  DB?: D1Database
}

export interface FunctionContext<Params extends object = Record<string, string | string[] | undefined>> {
  request: Request
  env: Env
  params: Params
}

export interface TranscriptRow {
  id: string
  episode_id: number
  episode_guid: string | null
  audio_url: string
  source_kind: StoredTranscript['sourceKind']
  source_url: string | null
  provider: string | null
  language: string | null
  format: string
  status: StoredTranscript['status']
  cue_count: number
  duration_seconds: number | null
  version: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface CueRow {
  id: number
  transcript_id: string
  cue_index: number
  start_time: number
  end_time: number
  text: string
  speaker: string | null
}

export interface JobRow {
  id: string
  episode_id: number
  episode_guid: string | null
  audio_url: string
  provider: string
  status: TranscriptJob['status']
  request_payload: string | null
  provider_job_id: string | null
  provider_status: string | null
  result_transcript_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface SaveTranscriptInput {
  episodeId: number
  episodeGuid?: string
  audioUrl: string
  sourceKind: StoredTranscript['sourceKind']
  sourceUrl?: string
  provider?: string
  language?: string
  format: string
  status?: StoredTranscript['status']
  errorMessage?: string
  cues: TranscriptCue[]
}
