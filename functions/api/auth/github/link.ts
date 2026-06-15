import { buildGithubAuthorizationUrl } from '../../../lib/oauth'
import { getCurrentSession, getOrigin, randomToken, requireAuthConfig, requireGithubConfig, signOAuthState, stateCookie } from '../../../lib/auth'
import { jsonError, jsonResponse, requireDb } from '../../../lib/http'
import type { FunctionContext } from '../../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'POST') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError
  const authConfigError = requireAuthConfig(env)
  if (authConfigError) return authConfigError
  const githubConfigError = requireGithubConfig(env)
  if (githubConfigError) return githubConfigError

  const current = await getCurrentSession(request, env)
  if (!current) return jsonError('Authentication required', 401)

  const state = await signOAuthState(
    { nonce: randomToken(18), intent: 'link', userId: current.user.id, createdAt: Date.now() },
    env.AUTH_SESSION_SECRET!
  )
  const origin = getOrigin(request, env)
  const url = buildGithubAuthorizationUrl({
    clientId: env.GITHUB_CLIENT_ID!,
    redirectUri: `${origin}/api/auth/github/callback`,
    state,
  })

  return jsonResponse({ url }, { headers: { 'Set-Cookie': stateCookie(state) } })
}
