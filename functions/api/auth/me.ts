import { getCurrentSession, isFirstUse, listIdentities } from '../../lib/auth'
import { jsonError, jsonResponse, requireDb } from '../../lib/http'
import type { FunctionContext } from '../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'GET') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await getCurrentSession(request, env)
  if (!current) return jsonResponse({ user: null, identities: [], isFirstUse: false }, { headers: { 'Cache-Control': 'no-store' } })

  return jsonResponse(
    {
      user: current.user,
      identities: await listIdentities(env.DB!, current.user.id),
      isFirstUse: await isFirstUse(env.DB!, current.user.id),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
