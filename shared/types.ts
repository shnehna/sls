export interface Person {
  id: number
  name: string
  role?: string
  group?: string
  href?: string
  img?: string
}

export interface TranscriptCue {
  id: number
  startTime: number
  endTime: number
  text: string
  speaker?: string
}

export type TranscriptFileType =
  | 'application/json'
  | 'application/srt'
  | 'text/html'
  | 'text/plain'
  | 'text/srt'
  | 'text/vtt'

export type EpisodeTranscriptStatus = 'missing' | 'processing' | 'ready' | 'failed'

export type TranscriptSourceKind =
  | 'podcast_index_remote'
  | 'imported_remote'
  | 'manual'
  | 'provider_webhook'
  | 'provider_poll'
  | 'mock'

export type TranscriptionJobStatus =
  | 'queued'
  | 'processing'
  | 'awaiting_upload'
  | 'awaiting_webhook'
  | 'completed'
  | 'failed'

export interface StoredTranscript {
  id: string
  episodeId: number
  episodeGuid?: string
  audioUrl: string
  sourceKind: TranscriptSourceKind
  sourceUrl?: string
  provider?: string
  language?: string
  format: string
  status: 'processing' | 'ready' | 'failed'
  cueCount: number
  durationSeconds?: number
  version: number
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface TranscriptJob {
  id: string
  episodeId: number
  episodeGuid?: string
  audioUrl: string
  provider: string
  status: TranscriptionJobStatus
  requestPayload?: string
  providerJobId?: string
  providerStatus?: string
  resultTranscriptId?: string
  errorMessage?: string
  createdByUserId?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface EpisodeTranscriptResponse {
  episodeId: number
  status: EpisodeTranscriptStatus
  transcript: StoredTranscript | null
  cues: TranscriptCue[]
  job?: TranscriptJob | null
  errorMessage?: string
}
