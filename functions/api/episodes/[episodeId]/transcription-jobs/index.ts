import { requireCurrentUser } from '../../../../lib/auth'
import { getConfiguredProvider, submitTranscription } from '../../../../lib/stt'
import {
  createTranscriptionJob,
  failTranscriptionJob,
  updateTranscriptionJobProviderState,
} from '../../../../lib/transcripts'
import { getNumericParam, jsonError, jsonResponse, readJsonBody, requireDb } from '../../../../lib/http'
import type { FunctionContext } from '../../../../lib/types'

interface Params {
  episodeId?: string | string[]
}

interface CreateJobBody {
  episodeGuid?: string
  audioUrl?: string
  provider?: string
  language?: string
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const episodeId = getNumericParam(params.episodeId, 'episode id')
  if (episodeId instanceof Response) return episodeId

  const body = await readJsonBody<CreateJobBody>(request)
  if (body instanceof Response) return body
  if (!body.audioUrl) return jsonError('Missing audioUrl', 400)

  const provider = getConfiguredProvider(env, body.provider)
  const job = await createTranscriptionJob(env.DB!, {
    episodeId,
    episodeGuid: body.episodeGuid,
    audioUrl: body.audioUrl,
    provider,
    createdByUserId: current.user.id,
    requestPayload: {
      provider,
      language: body.language,
    },
  })

  if (job.providerJobId || job.status === 'awaiting_webhook') {
    return jsonResponse({ job }, { status: 200 })
  }

  try {
    const submission = await submitTranscription(env, {
      jobId: job.id,
      audioUrl: body.audioUrl,
      episodeGuid: body.episodeGuid,
      language: body.language,
      requestedProvider: provider,
    })

    const updatedJob = await updateTranscriptionJobProviderState(env.DB!, job.id, {
      status: submission.status,
      providerJobId: submission.providerJobId,
      providerStatus: submission.providerStatus,
      requestPayload: submission.requestPayload,
    })

    return jsonResponse({ job: updatedJob }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit transcription job'
    const failedJob = await failTranscriptionJob(env.DB!, job.id, message)
    return jsonResponse({ job: failedJob, error: message }, { status: 502 })
  }
}
