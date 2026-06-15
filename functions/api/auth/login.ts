import { createSession, isFirstUse, listIdentities, normalizeUsername, publicUser, requireAuthConfig, sessionCookie, verifyPassword, type PasswordCredentialRow, type UserRow } from '../../lib/auth'
import { jsonError, jsonResponse, readJsonBody, requireDb } from '../../lib/http'
import type { FunctionContext } from '../../lib/types'

interface LoginBody {
  username?: string
  password?: string
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError
  const configError = requireAuthConfig(env)
  if (configError) return configError

  const body = await readJsonBody<LoginBody>(request)
  if (body instanceof Response) return body

  const username = normalizeUsername(body.username)
  if (!username || typeof body.password !== 'string') return jsonError('Invalid username or password', 401)

  const user = await env.DB!.prepare('SELECT * FROM users WHERE username = ? LIMIT 1').bind(username).first<UserRow>()
  if (!user) return jsonError('Invalid username or password', 401)

  const credential = await env.DB!.prepare('SELECT * FROM password_credentials WHERE user_id = ? LIMIT 1').bind(user.id).first<PasswordCredentialRow>()
  if (!credential) return jsonError('Invalid username or password', 401)

  const verified = await verifyPassword(body.password, credential, env.AUTH_PASSWORD_PEPPER!)
  if (!verified) return jsonError('Invalid username or password', 401)

  const session = await createSession(env.DB!, user.id, env)

  return jsonResponse(
    { user: publicUser(user), identities: await listIdentities(env.DB!, user.id), isFirstUse: await isFirstUse(env.DB!, user.id) },
    { headers: { 'Set-Cookie': sessionCookie(session.token, session.row.expires_at) } }
  )
}
