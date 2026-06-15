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

export interface AuthStateResponse {
  user: AuthUser | null
  identities: AuthIdentity[]
  isFirstUse: boolean
}

interface LoginInput {
  username: string
  password: string
  remember?: boolean
}

interface RegisterInput {
  username: string
  displayName?: string
  password: string
}

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

async function fetchAuthJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const data = await response.json() as { error?: string }
      if (data.error) message = data.error
    } catch {
      // Keep HTTP status message when the response is not JSON.
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function getCurrentUser(): Promise<AuthStateResponse> {
  return fetchAuthJson<AuthStateResponse>('/api/auth/me')
}

export function login(input: LoginInput): Promise<AuthStateResponse> {
  return fetchAuthJson<AuthStateResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function register(input: RegisterInput): Promise<AuthStateResponse> {
  return fetchAuthJson<AuthStateResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function logout(): Promise<{ ok: true }> {
  return fetchAuthJson<{ ok: true }>('/api/auth/logout', { method: 'POST' })
}

export function changePassword(input: ChangePasswordInput): Promise<{ ok: true }> {
  return fetchAuthJson<{ ok: true }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function startGithubLogin(link = false): Promise<void> {
  if (!link) {
    window.location.href = '/api/auth/github/start'
    return
  }

  const { url } = await fetchAuthJson<{ url: string }>('/api/auth/github/link', { method: 'POST' })
  window.location.href = url
}

export function unlinkIdentity(identityId: string): Promise<{ ok: true }> {
  return fetchAuthJson<{ ok: true }>(`/api/auth/identities/${identityId}/unlink`, { method: 'POST' })
}
