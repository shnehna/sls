import { exchangeGithubCode, fetchGithubProfile, type GithubProfile } from '../../../lib/oauth'
import { clearStateCookie, createSession, getCurrentSession, getOrigin, GITHUB_STATE_COOKIE, parseCookies, randomId, requireAuthConfig, requireGithubConfig, sessionCookie, validateUsername, verifyOAuthState, type IdentityRow, type UserRow } from '../../../lib/auth'
import { requireDb } from '../../../lib/http'
import type { D1Database, FunctionContext } from '../../../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  const origin = getOrigin(request, env)
  const callbackUrl = `${origin}/auth/callback/github`

  if (request.method !== 'GET') return redirect(callbackUrl, { error: 'method_not_allowed' }, [clearStateCookie()])

  const dbError = requireDb(env)
  if (dbError) return redirect(callbackUrl, { error: 'missing_database' }, [clearStateCookie()])
  const authConfigError = requireAuthConfig(env)
  if (authConfigError) return redirect(callbackUrl, { error: 'missing_auth_config' }, [clearStateCookie()])
  const githubConfigError = requireGithubConfig(env)
  if (githubConfigError) return redirect(callbackUrl, { error: 'missing_github_config' }, [clearStateCookie()])

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = parseCookies(request.headers.get('cookie')).get(GITHUB_STATE_COOKIE)
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirect(callbackUrl, { error: 'invalid_state' }, [clearStateCookie()])
  }

  const payload = await verifyOAuthState(state, env.AUTH_SESSION_SECRET!)
  if (!payload) return redirect(callbackUrl, { error: 'invalid_state' }, [clearStateCookie()])

  const redirectUri = `${origin}/api/auth/github/callback`
  const accessToken = await exchangeGithubCode({
    clientId: env.GITHUB_CLIENT_ID!,
    clientSecret: env.GITHUB_CLIENT_SECRET!,
    code,
    redirectUri,
  })
  if (accessToken instanceof Response) return redirect(callbackUrl, { error: 'github_exchange_failed' }, [clearStateCookie()])

  const profile = await fetchGithubProfile(accessToken)
  if (profile instanceof Response) return redirect(callbackUrl, { error: 'github_profile_failed' }, [clearStateCookie()])

  const db = env.DB!
  const providerUserId = String(profile.id)
  const existingIdentity = await db.prepare(`
    SELECT * FROM auth_identities
    WHERE provider = 'github' AND provider_user_id = ?
    LIMIT 1
  `).bind(providerUserId).first<IdentityRow>()

  let userId: string

  if (payload.intent === 'link') {
    const current = await getCurrentSession(request, env)
    if (!current || !payload.userId || current.user.id !== payload.userId) {
      return redirect(callbackUrl, { error: 'link_session_expired' }, [clearStateCookie()])
    }
    if (existingIdentity && existingIdentity.user_id !== current.user.id) {
      return redirect(callbackUrl, { error: 'github_already_linked' }, [clearStateCookie()])
    }

    userId = current.user.id
    if (existingIdentity) {
      await updateGithubIdentity(db, existingIdentity.id, profile)
    } else {
      await insertGithubIdentity(db, userId, profile)
      await db.prepare('UPDATE users SET avatar_url = COALESCE(avatar_url, ?), updated_at = ? WHERE id = ?')
        .bind(profile.avatar_url, new Date().toISOString(), userId)
        .run()
    }
  } else if (existingIdentity) {
    userId = existingIdentity.user_id
    await updateGithubIdentity(db, existingIdentity.id, profile)
  } else {
    userId = await createGithubUser(db, profile)
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
  if (!user) return redirect(callbackUrl, { error: 'user_not_found' }, [clearStateCookie()])

  const session = await createSession(db, userId, env)
  return redirect(callbackUrl, { status: 'success' }, [clearStateCookie(), sessionCookie(session.token, session.row.expires_at)])
}

async function createGithubUser(db: D1Database, profile: GithubProfile): Promise<string> {
  const userId = randomId('user')
  const createdAt = new Date().toISOString()
  const username = await findAvailableUsername(db, profile.login || `github-${profile.id}`)
  const displayName = (profile.name || profile.login || username).slice(0, 80)

  await db.batch([
    db.prepare(`
      INSERT INTO users (id, username, display_name, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, username, displayName, profile.avatar_url, createdAt, createdAt),
    db.prepare(`
      INSERT INTO auth_identities (id, user_id, provider, provider_user_id, provider_username, display_name, avatar_url, email, created_at, updated_at)
      VALUES (?, ?, 'github', ?, ?, ?, ?, ?, ?, ?)
    `).bind(randomId('idn'), userId, String(profile.id), profile.login, profile.name, profile.avatar_url, profile.email, createdAt, createdAt),
  ])

  return userId
}

async function insertGithubIdentity(db: D1Database, userId: string, profile: GithubProfile): Promise<void> {
  const createdAt = new Date().toISOString()
  await db.prepare(`
    INSERT INTO auth_identities (id, user_id, provider, provider_user_id, provider_username, display_name, avatar_url, email, created_at, updated_at)
    VALUES (?, ?, 'github', ?, ?, ?, ?, ?, ?, ?)
  `).bind(randomId('idn'), userId, String(profile.id), profile.login, profile.name, profile.avatar_url, profile.email, createdAt, createdAt).run()
}

async function updateGithubIdentity(db: D1Database, identityId: string, profile: GithubProfile): Promise<void> {
  await db.prepare(`
    UPDATE auth_identities
    SET provider_username = ?, display_name = ?, avatar_url = ?, email = ?, updated_at = ?
    WHERE id = ?
  `).bind(profile.login, profile.name, profile.avatar_url, profile.email, new Date().toISOString(), identityId).run()
}

async function findAvailableUsername(db: D1Database, login: string): Promise<string> {
  const base = normalizeGithubUsername(login)
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`
    const error = validateUsername(candidate)
    if (error) continue
    const existing = await db.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').bind(candidate).first<{ id: string }>()
    if (!existing) return candidate
  }
  return `github-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function normalizeGithubUsername(login: string): string {
  const normalized = login.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized.length >= 3 ? normalized.slice(0, 24) : `github-${normalized || 'user'}`
}

function redirect(baseUrl: string, params: Record<string, string>, cookies: string[]): Response {
  const url = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  const headers = new Headers({ Location: url.toString() })
  cookies.forEach((cookie) => headers.append('Set-Cookie', cookie))
  return new Response(null, { status: 302, headers })
}
