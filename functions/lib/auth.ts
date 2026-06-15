import type { D1Database, Env } from './types'

export const SESSION_COOKIE = 'shadowcast_session'
export const GITHUB_STATE_COOKIE = 'shadowcast_github_state'

const PASSWORD_ITERATIONS = 180000
const SESSION_DAYS = 30
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60
const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'auth',
  'help',
  'login',
  'logout',
  'me',
  'root',
  'shadowcast',
  'signup',
  'support',
  'system',
])

const encoder = new TextEncoder()

export interface UserRow {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface IdentityRow {
  id: string
  user_id: string
  provider: string
  provider_user_id: string
  provider_username: string | null
  display_name: string | null
  avatar_url: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface PasswordCredentialRow {
  user_id: string
  password_hash: string
  salt: string
  iterations: number
  created_at: string
  updated_at: string
}

export interface SessionRow {
  id: string
  user_id: string
  token_hash: string
  created_at: string
  expires_at: string
  last_seen_at: string
  revoked_at: string | null
}

export interface AuthUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  createdAt: string
}

export interface AuthIdentity {
  id: string
  provider: string
  providerUserId: string
  providerUsername?: string
  displayName?: string
  avatarUrl?: string
  email?: string
  createdAt: string
}

export interface CurrentSession {
  user: AuthUser
  session: SessionRow
}

export interface OAuthStatePayload {
  nonce: string
  intent: 'login' | 'link'
  userId?: string
  createdAt: number
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim().toLowerCase()
}

export function validateUsername(value: unknown): string | null {
  const username = normalizeUsername(value)
  if (!username) return 'Username is required'
  if (username.length < 3 || username.length > 24) return 'Username must be 3–24 characters'
  if (!/^[a-z0-9_-]+$/.test(username)) return 'Username can only use letters, numbers, underscores, and hyphens'
  if (RESERVED_USERNAMES.has(username)) return 'Username is reserved'
  return null
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string') return 'Password is required'
  if (value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return 'Password must include at least one letter and one number'
  return null
}

export function publicUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at,
  }
}

export function publicIdentity(row: IdentityRow): AuthIdentity {
  return {
    id: row.id,
    provider: row.provider,
    providerUserId: row.provider_user_id,
    providerUsername: row.provider_username || undefined,
    displayName: row.display_name || undefined,
    avatarUrl: row.avatar_url || undefined,
    email: row.email || undefined,
    createdAt: row.created_at,
  }
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomToken(18)}`
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export async function hashPassword(password: string, pepper: string): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = randomToken(18)
  const iterations = PASSWORD_ITERATIONS
  const hash = await derivePasswordHash(password, pepper, salt, iterations)
  return { hash, salt, iterations }
}

export async function verifyPassword(password: string, credential: PasswordCredentialRow, pepper: string): Promise<boolean> {
  const hash = await derivePasswordHash(password, pepper, credential.salt, credential.iterations)
  return constantTimeEqual(hash, credential.password_hash)
}

export async function createSession(db: D1Database, userId: string, env: Env): Promise<{ token: string; row: SessionRow }> {
  const token = randomToken(32)
  const tokenHash = await sha256Hex(token)
  const createdAt = nowIso()
  const days = Number(env.AUTH_SESSION_DAYS || SESSION_DAYS)
  const expiresAt = new Date(Date.now() + (Number.isFinite(days) && days > 0 ? days : SESSION_DAYS) * 24 * 60 * 60 * 1000).toISOString()
  const row: SessionRow = {
    id: randomId('sess'),
    user_id: userId,
    token_hash: tokenHash,
    created_at: createdAt,
    expires_at: expiresAt,
    last_seen_at: createdAt,
    revoked_at: null,
  }

  await db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).bind(row.id, row.user_id, row.token_hash, row.created_at, row.expires_at, row.last_seen_at).run()

  return { token, row }
}

export async function getCurrentSession(request: Request, env: Env): Promise<CurrentSession | null> {
  if (!env.DB) return null
  const token = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE)
  if (!token) return null

  const tokenHash = await sha256Hex(token)
  const row = await env.DB.prepare(`
    SELECT
      s.id AS session_id,
      s.user_id AS session_user_id,
      s.token_hash,
      s.created_at AS session_created_at,
      s.expires_at,
      s.last_seen_at,
      s.revoked_at,
      u.id,
      u.username,
      u.display_name,
      u.avatar_url,
      u.created_at,
      u.updated_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, nowIso()).first<{
    session_id: string
    session_user_id: string
    token_hash: string
    session_created_at: string
    expires_at: string
    last_seen_at: string
    revoked_at: string | null
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    created_at: string
    updated_at: string
  }>()

  if (!row) return null

  await env.DB.prepare('UPDATE user_sessions SET last_seen_at = ? WHERE id = ?')
    .bind(nowIso(), row.session_id)
    .run()

  return {
    user: publicUser({
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }),
    session: {
      id: row.session_id,
      user_id: row.session_user_id,
      token_hash: row.token_hash,
      created_at: row.session_created_at,
      expires_at: row.expires_at,
      last_seen_at: row.last_seen_at,
      revoked_at: row.revoked_at,
    },
  }
}

export async function listIdentities(db: D1Database, userId: string): Promise<AuthIdentity[]> {
  const rows = await db.prepare(`
    SELECT * FROM auth_identities
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).bind(userId).all<IdentityRow>()

  return (rows.results || []).map(publicIdentity)
}

export async function isFirstUse(db: D1Database, userId: string): Promise<boolean> {
  const saved = await db.prepare('SELECT id FROM user_saved_podcasts WHERE user_id = ? LIMIT 1').bind(userId).first<{ id: string }>()
  const progress = await db.prepare('SELECT id FROM user_episode_progress WHERE user_id = ? LIMIT 1').bind(userId).first<{ id: string }>()
  const bookmarks = await db.prepare('SELECT id FROM user_transcript_bookmarks WHERE user_id = ? LIMIT 1').bind(userId).first<{ id: string }>()
  return !saved && !progress && !bookmarks
}

export function sessionCookie(token: string, expiresAt: string): string {
  return serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  })
}

export function stateCookie(state: string): string {
  return serializeCookie(GITHUB_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  })
}

export function clearStateCookie(): string {
  return serializeCookie(GITHUB_STATE_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  })
}

export async function signOAuthState(payload: OAuthStatePayload, secret: string): Promise<string> {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = await hmacSha256Base64Url(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export async function verifyOAuthState(token: string, secret: string): Promise<OAuthStatePayload | null> {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expected = await hmacSha256Base64Url(encodedPayload, secret)
  if (!constantTimeEqual(signature, expected)) return null

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as OAuthStatePayload
    if (!payload.nonce || !payload.intent || typeof payload.createdAt !== 'number') return null
    if (Date.now() - payload.createdAt > OAUTH_STATE_MAX_AGE_SECONDS * 1000) return null
    return payload
  } catch {
    return null
  }
}

export function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!header) return cookies

  header.split(';').forEach((part) => {
    const [name, ...valueParts] = part.trim().split('=')
    if (!name) return
    cookies.set(name, decodeURIComponent(valueParts.join('=')))
  })

  return cookies
}

export function requireAuthConfig(env: Env): Response | null {
  if (!env.AUTH_PASSWORD_PEPPER) return Response.json({ error: 'AUTH_PASSWORD_PEPPER is not configured' }, { status: 500 })
  if (!env.AUTH_SESSION_SECRET) return Response.json({ error: 'AUTH_SESSION_SECRET is not configured' }, { status: 500 })
  return null
}

export function requireGithubConfig(env: Env): Response | null {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return Response.json({ error: 'GitHub OAuth is not configured' }, { status: 500 })
  }
  return null
}

export function redirectWithQuery(url: string, params: Record<string, string>): Response {
  const target = new URL(url)
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value))
  return Response.redirect(target.toString(), 302)
}

export function getOrigin(request: Request, env: Env): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, '')
  return new URL(request.url).origin
}

async function derivePasswordHash(password: string, pepper: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${password}${pepper}`),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations,
    },
    key,
    256
  )
  return base64Url(new Uint8Array(bits))
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256Base64Url(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return base64Url(new Uint8Array(signature))
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeBase64Url(value: string): string {
  return base64Url(encoder.encode(value))
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new TextDecoder().decode(bytes)
}

function constantTimeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  }
  return mismatch === 0
}

function serializeCookie(name: string, value: string, options: { httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; path?: string; expires?: Date; maxAge?: number }): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  return parts.join('; ')
}
