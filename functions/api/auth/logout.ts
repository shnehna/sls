import { clearSessionCookie, getCurrentSession } from '../../lib/auth'
import { jsonError, jsonResponse, requireDb } from '../../lib/http'
import type { FunctionContext } from '../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await getCurrentSession(request, env)
  if (current) {
    await env.DB!.prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), current.session.id)
      .run()
  }

  return jsonResponse({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
}
