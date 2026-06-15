export interface GithubProfile {
  id: number
  login: string
  name: string | null
  avatar_url: string | null
  email: string | null
}

export function buildGithubAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('state', input.state)
  url.searchParams.set('scope', 'read:user user:email')
  return url.toString()
}

export async function exchangeGithubCode(input: { clientId: string; clientSecret: string; code: string; redirectUri: string }): Promise<string | Response> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'ShadowCast',
    },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  })

  if (!response.ok) return Response.json({ error: 'GitHub token exchange failed' }, { status: 502 })

  const data = await response.json() as { access_token?: string; error_description?: string }
  if (!data.access_token) {
    return Response.json({ error: data.error_description || 'GitHub token exchange failed' }, { status: 502 })
  }

  return data.access_token
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile | Response> {
  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'ShadowCast',
    },
  })

  if (!profileResponse.ok) return Response.json({ error: 'GitHub profile fetch failed' }, { status: 502 })

  const profile = await profileResponse.json() as GithubProfile
  let email = profile.email

  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'ShadowCast',
      },
    })

    if (emailResponse.ok) {
      const emails = await emailResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>
      email = emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email || null
    }
  }

  return { ...profile, email }
}
