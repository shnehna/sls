import { getNumericParam, jsonResponse, requireDb } from '../../../../lib/http'
import { getEpisodeTranscript } from '../../../../lib/transcripts'
import type { FunctionContext } from '../../../../lib/types'

interface Params {
  episodeId?: string | string[]
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const episodeId = getNumericParam(params.episodeId, 'episode id')
  if (episodeId instanceof Response) return episodeId

  const data = await getEpisodeTranscript(env.DB!, episodeId)
  return jsonResponse(data, {
    headers: {
      'Cache-Control': data.status === 'ready' ? 'private, max-age=300' : 'no-store',
    },
  })
}
