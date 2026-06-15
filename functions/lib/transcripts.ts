import type {
  CueRow,
  D1Database,
  JobRow,
  SaveTranscriptInput,
  TranscriptRow,
} from './types'
import type { EpisodeTranscriptResponse, StoredTranscript, TranscriptCue, TranscriptJob } from '../../shared/types'

const OPEN_JOB_STATUSES = ['queued', 'processing', 'awaiting_upload', 'awaiting_webhook']

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function optionalString(value: string | null): string | undefined {
  return value ?? undefined
}

export function mapTranscriptRow(row: TranscriptRow): StoredTranscript {
  return {
    id: row.id,
    episodeId: row.episode_id,
    episodeGuid: optionalString(row.episode_guid),
    audioUrl: row.audio_url,
    sourceKind: row.source_kind,
    sourceUrl: optionalString(row.source_url),
    provider: optionalString(row.provider),
    language: optionalString(row.language),
    format: row.format,
    status: row.status,
    cueCount: row.cue_count,
    durationSeconds: row.duration_seconds ?? undefined,
    version: row.version,
    errorMessage: optionalString(row.error_message),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapJobRow(row: JobRow): TranscriptJob {
  return {
    id: row.id,
    episodeId: row.episode_id,
    episodeGuid: optionalString(row.episode_guid),
    audioUrl: row.audio_url,
    provider: row.provider,
    status: row.status,
    requestPayload: optionalString(row.request_payload),
    providerJobId: optionalString(row.provider_job_id),
    providerStatus: optionalString(row.provider_status),
    resultTranscriptId: optionalString(row.result_transcript_id),
    errorMessage: optionalString(row.error_message),
    createdByUserId: optionalString(row.created_by_user_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: optionalString(row.completed_at),
  }
}

function mapCueRow(row: CueRow): TranscriptCue {
  return {
    id: row.cue_index,
    startTime: row.start_time,
    endTime: row.end_time,
    text: row.text,
    speaker: optionalString(row.speaker),
  }
}

export async function getEpisodeTranscript(db: D1Database, episodeId: number): Promise<EpisodeTranscriptResponse> {
  const transcriptRow = await db.prepare(`
    SELECT * FROM episode_transcripts
    WHERE episode_id = ? AND status = 'ready'
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(episodeId).first<TranscriptRow>()

  if (transcriptRow) {
    const cuesResult = await db.prepare(`
      SELECT * FROM transcript_cues
      WHERE transcript_id = ?
      ORDER BY cue_index ASC
    `).bind(transcriptRow.id).all<CueRow>()

    return {
      episodeId,
      status: 'ready',
      transcript: mapTranscriptRow(transcriptRow),
      cues: (cuesResult.results || []).map(mapCueRow),
    }
  }

  const jobRow = await getOpenJobForEpisode(db, episodeId)
  if (jobRow) {
    return {
      episodeId,
      status: jobRow.status === 'failed' ? 'failed' : 'processing',
      transcript: null,
      cues: [],
      job: mapJobRow(jobRow),
      errorMessage: optionalString(jobRow.error_message),
    }
  }

  const failedTranscript = await db.prepare(`
    SELECT * FROM episode_transcripts
    WHERE episode_id = ? AND status = 'failed'
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(episodeId).first<TranscriptRow>()

  if (failedTranscript) {
    return {
      episodeId,
      status: 'failed',
      transcript: mapTranscriptRow(failedTranscript),
      cues: [],
      errorMessage: optionalString(failedTranscript.error_message),
    }
  }

  const failedJob = await db.prepare(`
    SELECT * FROM transcription_jobs
    WHERE episode_id = ? AND status = 'failed'
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(episodeId).first<JobRow>()

  if (failedJob) {
    return {
      episodeId,
      status: 'failed',
      transcript: null,
      cues: [],
      job: mapJobRow(failedJob),
      errorMessage: optionalString(failedJob.error_message),
    }
  }

  return {
    episodeId,
    status: 'missing',
    transcript: null,
    cues: [],
  }
}

export async function saveTranscript(db: D1Database, input: SaveTranscriptInput): Promise<StoredTranscript> {
  const existing = await db.prepare(`
    SELECT * FROM episode_transcripts
    WHERE episode_id = ?
    LIMIT 1
  `).bind(input.episodeId).first<TranscriptRow>()

  const timestamp = nowIso()
  const transcriptId = existing?.id || uid('tr')
  const status = input.status || 'ready'
  const maxEnd = input.cues.reduce((max, cue) => Math.max(max, cue.endTime), 0)

  if (existing) {
    await db.prepare(`
      UPDATE episode_transcripts
      SET episode_guid = ?, audio_url = ?, source_kind = ?, source_url = ?, provider = ?, language = ?,
          format = ?, status = ?, cue_count = ?, duration_seconds = ?, error_message = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      input.episodeGuid || null,
      input.audioUrl,
      input.sourceKind,
      input.sourceUrl || null,
      input.provider || null,
      input.language || null,
      input.format,
      status,
      input.cues.length,
      maxEnd || null,
      input.errorMessage || null,
      timestamp,
      transcriptId
    ).run()
  } else {
    await db.prepare(`
      INSERT INTO episode_transcripts (
        id, episode_id, episode_guid, audio_url, source_kind, source_url, provider, language,
        format, status, cue_count, duration_seconds, version, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).bind(
      transcriptId,
      input.episodeId,
      input.episodeGuid || null,
      input.audioUrl,
      input.sourceKind,
      input.sourceUrl || null,
      input.provider || null,
      input.language || null,
      input.format,
      status,
      input.cues.length,
      maxEnd || null,
      input.errorMessage || null,
      timestamp,
      timestamp
    ).run()
  }

  await db.prepare('DELETE FROM transcript_cues WHERE transcript_id = ?').bind(transcriptId).run()

  if (input.cues.length > 0) {
    const inserts = input.cues.map((cue, index) => db.prepare(`
      INSERT INTO transcript_cues (transcript_id, cue_index, start_time, end_time, text, speaker)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      transcriptId,
      index,
      cue.startTime,
      cue.endTime,
      cue.text,
      cue.speaker || null
    ))
    await db.batch(inserts)
  }

  const row = await db.prepare('SELECT * FROM episode_transcripts WHERE id = ?').bind(transcriptId).first<TranscriptRow>()
  if (!row) throw new Error('Failed to save transcript')
  return mapTranscriptRow(row)
}

export async function getOpenJobForEpisode(db: D1Database, episodeId: number): Promise<JobRow | null> {
  const placeholders = OPEN_JOB_STATUSES.map(() => '?').join(', ')
  return db.prepare(`
    SELECT * FROM transcription_jobs
    WHERE episode_id = ? AND status IN (${placeholders})
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(episodeId, ...OPEN_JOB_STATUSES).first<JobRow>()
}

export async function createTranscriptionJob(db: D1Database, input: {
  episodeId: number
  episodeGuid?: string
  audioUrl: string
  provider?: string
  requestPayload?: unknown
  createdByUserId?: string
}): Promise<TranscriptJob> {
  const provider = input.provider || 'manual'
  const existing = await db.prepare(`
    SELECT * FROM transcription_jobs
    WHERE episode_id = ? AND audio_url = ? AND provider = ?
      AND COALESCE(created_by_user_id, '') = COALESCE(?, '')
      AND status IN (${OPEN_JOB_STATUSES.map(() => '?').join(', ')})
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(input.episodeId, input.audioUrl, provider, input.createdByUserId || null, ...OPEN_JOB_STATUSES).first<JobRow>()

  if (existing) return mapJobRow(existing)

  const timestamp = nowIso()
  const status = provider === 'manual' ? 'awaiting_upload' : 'processing'
  const id = uid('job')

  await db.prepare(`
    INSERT INTO transcription_jobs (
      id, episode_id, episode_guid, audio_url, provider, status, request_payload, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.episodeId,
    input.episodeGuid || null,
    input.audioUrl,
    provider,
    status,
    input.requestPayload ? JSON.stringify(input.requestPayload) : null,
    input.createdByUserId || null,
    timestamp,
    timestamp
  ).run()

  const row = await db.prepare('SELECT * FROM transcription_jobs WHERE id = ?').bind(id).first<JobRow>()
  if (!row) throw new Error('Failed to create transcription job')
  return mapJobRow(row)
}

export async function getJob(db: D1Database, jobId: string): Promise<TranscriptJob | null> {
  const row = await db.prepare('SELECT * FROM transcription_jobs WHERE id = ?').bind(jobId).first<JobRow>()
  return row ? mapJobRow(row) : null
}

export async function getJobForUser(db: D1Database, jobId: string, userId: string): Promise<TranscriptJob | null> {
  const row = await db.prepare(`
    SELECT * FROM transcription_jobs
    WHERE id = ? AND created_by_user_id = ?
    LIMIT 1
  `).bind(jobId, userId).first<JobRow>()
  return row ? mapJobRow(row) : null
}

export async function getJobByProviderJobId(db: D1Database, provider: string, providerJobId: string): Promise<TranscriptJob | null> {
  const row = await db.prepare(`
    SELECT * FROM transcription_jobs
    WHERE provider = ? AND provider_job_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(provider, providerJobId).first<JobRow>()
  return row ? mapJobRow(row) : null
}

export async function updateTranscriptionJobProviderState(db: D1Database, jobId: string, input: {
  status: TranscriptJob['status']
  providerJobId?: string
  providerStatus?: string
  requestPayload?: unknown
  errorMessage?: string | null
}): Promise<TranscriptJob> {
  const timestamp = nowIso()
  await db.prepare(`
    UPDATE transcription_jobs
    SET status = ?, provider_job_id = COALESCE(?, provider_job_id), provider_status = ?,
        request_payload = COALESCE(?, request_payload), error_message = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    input.status,
    input.providerJobId || null,
    input.providerStatus || null,
    input.requestPayload ? JSON.stringify(input.requestPayload) : null,
    input.errorMessage || null,
    timestamp,
    jobId
  ).run()

  const job = await getJob(db, jobId)
  if (!job) throw new Error('Failed to update transcription job')
  return job
}

export async function failTranscriptionJob(db: D1Database, jobId: string, message: string, providerStatus?: string): Promise<TranscriptJob> {
  const timestamp = nowIso()
  await db.prepare(`
    UPDATE transcription_jobs
    SET status = 'failed', provider_status = ?, error_message = ?, updated_at = ?, completed_at = ?
    WHERE id = ?
  `).bind(providerStatus || 'failed', message, timestamp, timestamp, jobId).run()

  const job = await getJob(db, jobId)
  if (!job) throw new Error('Failed to fail transcription job')
  return job
}

export async function completeTranscriptionJob(db: D1Database, jobId: string, input: SaveTranscriptInput): Promise<{ job: TranscriptJob; transcript: StoredTranscript }> {
  const jobRow = await db.prepare('SELECT * FROM transcription_jobs WHERE id = ?').bind(jobId).first<JobRow>()
  if (!jobRow) throw new Error('Job not found')
  if (jobRow.status === 'completed') throw new Error('Job is already completed')

  const transcript = await saveTranscript(db, input)
  const timestamp = nowIso()

  await db.prepare(`
    UPDATE transcription_jobs
    SET status = 'completed', result_transcript_id = ?, error_message = NULL, updated_at = ?, completed_at = ?
    WHERE id = ?
  `).bind(transcript.id, timestamp, timestamp, jobId).run()

  const updatedJob = await getJob(db, jobId)
  if (!updatedJob) throw new Error('Failed to update job')
  return { job: updatedJob, transcript }
}
