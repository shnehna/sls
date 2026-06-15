import { createSession, hashPassword, listIdentities, nowIso, publicUser, randomId, requireAuthConfig, sessionCookie, validatePassword, validateUsername, isFirstUse } from '../../lib/auth'
import { jsonError, jsonResponse, readJsonBody, requireDb } from '../../lib/http'
import type { FunctionContext } from '../../lib/types'

interface RegisterBody {
  username?: string
  displayName?: string
  password?: string
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError
  const configError = requireAuthConfig(env)
  if (configError) return configError

  const body = await readJsonBody<RegisterBody>(request)
  if (body instanceof Response) return body

  const usernameError = validateUsername(body.username)
  if (usernameError) return jsonError(usernameError, 400)
  const passwordError = validatePassword(body.password)
  if (passwordError) return jsonError(passwordError, 400)

  const username = body.username!.trim().toLowerCase()
  const displayName = typeof body.displayName === 'string' && body.displayName.trim()
    ? body.displayName.trim().slice(0, 80)
    : username
  const userId = randomId('user')
  const identityId = randomId('idn')
  const createdAt = nowIso()
  const password = await hashPassword(body.password!, env.AUTH_PASSWORD_PEPPER!)

  try {
    await env.DB!.batch([
      env.DB!.prepare(`
        INSERT INTO users (id, username, display_name, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?)
      `).bind(userId, username, displayName, createdAt, createdAt),
      env.DB!.prepare(`
        INSERT INTO auth_identities (id, user_id, provider, provider_user_id, provider_username, display_name, avatar_url, email, created_at, updated_at)
        VALUES (?, ?, 'password', ?, ?, ?, NULL, NULL, ?, ?)
      `).bind(identityId, userId, username, username, displayName, createdAt, createdAt),
      env.DB!.prepare(`
        INSERT INTO password_credentials (user_id, password_hash, salt, iterations, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userId, password.hash, password.salt, password.iterations, createdAt, createdAt),
    ])
  } catch {
    return jsonError('Username is already taken', 409)
  }

  const session = await createSession(env.DB!, userId, env)
  const user = await env.DB!.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<Parameters<typeof publicUser>[0]>()
  if (!user) return jsonError('User was not created', 500)

  return jsonResponse(
    { user: publicUser(user), identities: await listIdentities(env.DB!, userId), isFirstUse: await isFirstUse(env.DB!, userId) },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(session.token, session.row.expires_at) } }
  )
}
