import { requireCurrentUser } from '../../../../lib/auth'
import { getEpisodeProgress, upsertEpisodeProgress } from '../../../../lib/personal'
import { getNumericParam, jsonError, jsonResponse, readJsonBody, requireDb } from '../../../../lib/http'
import type { FunctionContext } from '../../../../lib/types'

interface Params {
  episodeId?: string | string[]
}

interface ProgressBody {
  podcastId?: number
  positionSeconds?: number
  durationSeconds?: number
  episodeTitle?: string
  episodeImage?: string
  podcastTitle?: string
  podcastImage?: string
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (!['GET', 'PUT'].includes(request.method)) return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const episodeId = getNumericParam(params.episodeId, 'episode id')
  if (episodeId instanceof Response) return episodeId

  if (request.method === 'GET') {
    return jsonResponse({ progress: await getEpisodeProgress(env.DB!, current.user.id, episodeId) }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const body = await readJsonBody<ProgressBody>(request)
  if (body instanceof Response) return body
  if (typeof body.positionSeconds !== 'number') return jsonError('Missing positionSeconds', 400)

  const progress = await upsertEpisodeProgress(env.DB!, current.user.id, {
    episodeId,
    podcastId: body.podcastId,
    positionSeconds: Math.max(0, body.positionSeconds),
    durationSeconds: body.durationSeconds,
    episodeTitle: body.episodeTitle,
    episodeImage: body.episodeImage,
    podcastTitle: body.podcastTitle,
    podcastImage: body.podcastImage,
  })

  return jsonResponse({ progress })
}
