import { createTranscriptionJob } from '../../../../lib/transcripts'
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

  const episodeId = getNumericParam(params.episodeId, 'episode id')
  if (episodeId instanceof Response) return episodeId

  const body = await readJsonBody<CreateJobBody>(request)
  if (body instanceof Response) return body
  if (!body.audioUrl) return jsonError('Missing audioUrl', 400)

  const job = await createTranscriptionJob(env.DB!, {
    episodeId,
    episodeGuid: body.episodeGuid,
    audioUrl: body.audioUrl,
    provider: body.provider || 'manual',
    requestPayload: {
      provider: body.provider || 'manual',
      language: body.language,
    },
  })

  return jsonResponse({ job }, { status: 201 })
}
