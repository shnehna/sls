import { requireCurrentUser } from '../../../lib/auth'
import { jsonResponse, requireDb } from '../../../lib/http'
import { listEpisodeProgress } from '../../../lib/personal'
import type { FunctionContext } from '../../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 })

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  return jsonResponse({ progress: await listEpisodeProgress(env.DB!, current.user.id) }, { headers: { 'Cache-Control': 'no-store' } })
}
