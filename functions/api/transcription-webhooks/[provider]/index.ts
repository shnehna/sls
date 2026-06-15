import { parseWebhookPayload } from '../../../lib/stt'
import {
  completeTranscriptionJob,
  failTranscriptionJob,
  getJob,
  getJobByProviderJobId,
} from '../../../lib/transcripts'
import { getStringParam, jsonError, jsonResponse, requireDb } from '../../../lib/http'
import type { FunctionContext } from '../../../lib/types'

interface Params {
  provider?: string | string[]
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const provider = getStringParam(params.provider, 'provider')
  if (provider instanceof Response) return provider

  const parsed = await parseWebhookPayload(provider, request, env)
  if (parsed instanceof Response) return parsed

  const job = parsed.jobId
    ? await getJob(env.DB!, parsed.jobId)
    : parsed.providerJobId
      ? await getJobByProviderJobId(env.DB!, parsed.provider, parsed.providerJobId)
      : null

  if (!job) return jsonError('Transcription job not found for webhook', 404)

  if (parsed.status === 'failed') {
    const failedJob = await failTranscriptionJob(
      env.DB!,
      job.id,
      parsed.errorMessage || 'STT provider reported a failed transcription',
      parsed.providerStatus
    )
    return jsonResponse({ ok: false, job: failedJob, error: failedJob.errorMessage })
  }

  if (job.status === 'completed') {
    return jsonResponse({ ok: true, job, cueCount: 0, duplicate: true })
  }

  if (parsed.cues.length === 0) {
    const failedJob = await failTranscriptionJob(env.DB!, job.id, 'STT provider webhook did not contain parseable cues', parsed.providerStatus)
    return jsonResponse({ ok: false, job: failedJob, error: failedJob.errorMessage }, { status: 422 })
  }

  const result = await completeTranscriptionJob(env.DB!, job.id, {
    episodeId: job.episodeId,
    episodeGuid: job.episodeGuid,
    audioUrl: job.audioUrl,
    sourceKind: 'provider_webhook',
    provider: parsed.provider,
    language: parsed.language,
    format: 'normalized',
    cues: parsed.cues,
  })

  return jsonResponse({ ok: true, job: result.job, transcript: result.transcript, cueCount: parsed.cues.length })
}
