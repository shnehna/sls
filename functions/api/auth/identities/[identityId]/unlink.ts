import { getCurrentSession } from '../../../../lib/auth'
import { getStringParam, jsonError, jsonResponse, requireDb } from '../../../../lib/http'
import type { FunctionContext } from '../../../../lib/types'

interface Params {
  identityId?: string | string[]
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await getCurrentSession(request, env)
  if (!current) return jsonError('Authentication required', 401)

  const identityId = getStringParam(params.identityId, 'identityId')
  if (identityId instanceof Response) return identityId

  const identity = await env.DB!.prepare('SELECT id, user_id FROM auth_identities WHERE id = ? LIMIT 1')
    .bind(identityId)
    .first<{ id: string; user_id: string }>()
  if (!identity || identity.user_id !== current.user.id) return jsonError('Identity not found', 404)

  const count = await env.DB!.prepare('SELECT COUNT(*) AS count FROM auth_identities WHERE user_id = ?')
    .bind(current.user.id)
    .first<{ count: number }>()
  if (!count || count.count <= 1) return jsonError('Add another login method before unlinking this one', 400)

  await env.DB!.prepare('DELETE FROM auth_identities WHERE id = ?').bind(identityId).run()
  return jsonResponse({ ok: true })
}
