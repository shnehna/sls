import { buildGithubAuthorizationUrl } from '../../../lib/oauth'
import { GITHUB_STATE_COOKIE, getOrigin, parseCookies, randomToken, requireAuthConfig, requireGithubConfig, signOAuthState, stateCookie } from '../../../lib/auth'
import { jsonError } from '../../../lib/http'
import type { FunctionContext } from '../../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'GET') return jsonError('Method not allowed', 405)

  const authConfigError = requireAuthConfig(env)
  if (authConfigError) return authConfigError
  const githubConfigError = requireGithubConfig(env)
  if (githubConfigError) return githubConfigError

  const existingState = parseCookies(request.headers.get('cookie')).get(GITHUB_STATE_COOKIE)
  const state = existingState || await signOAuthState(
    { nonce: randomToken(18), intent: 'login', createdAt: Date.now() },
    env.AUTH_SESSION_SECRET!
  )
  const origin = getOrigin(request, env)
  const url = buildGithubAuthorizationUrl({
    clientId: env.GITHUB_CLIENT_ID!,
    redirectUri: `${origin}/api/auth/github/callback`,
    state,
  })

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Set-Cookie': stateCookie(state),
    },
  })
}
