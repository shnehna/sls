import { completeTranscriptionJob, getJob } from '../../../../lib/transcripts'
import { getStringParam, jsonError, jsonResponse, readJsonBody, requireDb } from '../../../../lib/http'
import type { FunctionContext } from '../../../../lib/types'
import { normalizeCues, parseTranscript } from '../../../../../shared/transcript'
import type { TranscriptCue, TranscriptFileType } from '../../../../../shared/types'

interface Params {
  jobId?: string | string[]
}

interface CompleteJobBody {
  format?: TranscriptFileType | 'normalized'
  type?: TranscriptFileType
  language?: string
  cues?: Array<Partial<TranscriptCue>>
  raw?: string
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const jobId = getStringParam(params.jobId, 'job id')
  if (jobId instanceof Response) return jobId

  const body = await readJsonBody<CompleteJobBody>(request)
  if (body instanceof Response) return body

  const job = await getJob(env.DB!, jobId)
  if (!job) return jsonError('Job not found', 404)
  if (job.status === 'completed') return jsonError('Job is already completed', 409)

  const format = body.format || body.type || 'normalized'
  const cues = body.cues
    ? normalizeCues(body.cues)
    : body.raw && body.type
      ? parseTranscript(body.raw, body.type)
      : []

  if (cues.length === 0) {
    return jsonError('Completion payload did not contain parseable cues', 422)
  }

  const result = await completeTranscriptionJob(env.DB!, jobId, {
    episodeId: job.episodeId,
    episodeGuid: job.episodeGuid,
    audioUrl: job.audioUrl,
    sourceKind: job.provider === 'mock' ? 'mock' : 'manual',
    provider: job.provider,
    language: body.language,
    format,
    cues,
  })

  return jsonResponse({ ok: true, job: result.job, transcript: result.transcript, cueCount: cues.length })
}
