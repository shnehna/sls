import { getStringParam, jsonError, jsonResponse } from '../../../lib/http'
import type { FunctionContext } from '../../../lib/types'

interface Params {
  provider?: string | string[]
}

export const onRequest = async ({ request, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  const provider = getStringParam(params.provider, 'provider')
  if (provider instanceof Response) return provider

  return jsonResponse(
    {
      ok: false,
      provider,
      error: 'Transcription webhook provider is not configured yet. Complete jobs with /api/transcription-jobs/:jobId/complete.',
    },
    { status: 501 }
  )
}
