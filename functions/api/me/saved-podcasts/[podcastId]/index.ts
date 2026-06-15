import { requireCurrentUser } from '../../../../lib/auth'
import { getNumericParam, jsonError, jsonResponse, requireDb } from '../../../../lib/http'
import { removeSavedPodcast } from '../../../../lib/personal'
import type { FunctionContext } from '../../../../lib/types'

interface Params {
  podcastId?: string | string[]
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'DELETE') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const podcastId = getNumericParam(params.podcastId, 'podcast id')
  if (podcastId instanceof Response) return podcastId

  await removeSavedPodcast(env.DB!, current.user.id, podcastId)
  return jsonResponse({ ok: true })
}
