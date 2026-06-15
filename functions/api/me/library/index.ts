import { requireCurrentUser } from '../../../lib/auth'
import { jsonResponse, requireDb } from '../../../lib/http'
import { getLibrarySummary } from '../../../lib/personal'
import type { FunctionContext } from '../../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 })

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const library = await getLibrarySummary(env.DB!, current.user.id)
  return jsonResponse(library, { headers: { 'Cache-Control': 'no-store' } })
}
