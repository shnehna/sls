import { getCurrentSession, hashPassword, requireAuthConfig, validatePassword, verifyPassword, type PasswordCredentialRow } from '../../lib/auth'
import { jsonError, jsonResponse, readJsonBody, requireDb } from '../../lib/http'
import type { FunctionContext } from '../../lib/types'

interface ChangePasswordBody {
  currentPassword?: string
  newPassword?: string
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError
  const configError = requireAuthConfig(env)
  if (configError) return configError

  const current = await getCurrentSession(request, env)
  if (!current) return jsonError('Authentication required', 401)

  const body = await readJsonBody<ChangePasswordBody>(request)
  if (body instanceof Response) return body

  if (typeof body.currentPassword !== 'string') return jsonError('Current password is required', 400)
  const passwordError = validatePassword(body.newPassword)
  if (passwordError) return jsonError(passwordError, 400)

  const credential = await env.DB!.prepare('SELECT * FROM password_credentials WHERE user_id = ? LIMIT 1')
    .bind(current.user.id)
    .first<PasswordCredentialRow>()
  if (!credential) return jsonError('Password login is not enabled for this account', 400)

  const verified = await verifyPassword(body.currentPassword, credential, env.AUTH_PASSWORD_PEPPER!)
  if (!verified) return jsonError('Current password is incorrect', 400)

  const next = await hashPassword(body.newPassword!, env.AUTH_PASSWORD_PEPPER!)
  await env.DB!.prepare(`
    UPDATE password_credentials
    SET password_hash = ?, salt = ?, iterations = ?, updated_at = ?
    WHERE user_id = ?
  `).bind(next.hash, next.salt, next.iterations, new Date().toISOString(), current.user.id).run()

  return jsonResponse({ ok: true })
}
