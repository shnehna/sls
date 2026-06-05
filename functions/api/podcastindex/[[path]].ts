interface Env {
  PODCAST_INDEX_KEY?: string
  PODCAST_INDEX_SECRET?: string
}

interface PodcastIndexContext {
  request: Request
  env: Env
  params: {
    path?: string | string[]
  }
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', data)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getPathParam(path?: string | string[]): string {
  if (!path) return ''
  return Array.isArray(path) ? path.join('/') : path
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export const onRequest = async ({ request, env, params }: PodcastIndexContext): Promise<Response> => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonError('Method not allowed', 405)
  }

  const apiKey = env.PODCAST_INDEX_KEY || ''
  const apiSecret = env.PODCAST_INDEX_SECRET || ''

  if (!apiKey || !apiSecret) {
    return jsonError('PodcastIndex credentials are missing', 500)
  }

  const incomingUrl = new URL(request.url)
  const path = getPathParam(params.path)
  const targetUrl = new URL(`https://api.podcastindex.org/api/1.0/${path}`)
  targetUrl.search = incomingUrl.search

  const authDate = Math.floor(Date.now() / 1000).toString()
  const authorization = await sha1Hex(apiKey + apiSecret + authDate)

  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: {
      'User-Agent': 'ShadowCast/1.0',
      'X-Auth-Date': authDate,
      'X-Auth-Key': apiKey,
      Authorization: authorization,
      Accept: 'application/json',
    },
  })

  const headers = new Headers(upstream.headers)
  headers.set('Cache-Control', 'public, max-age=300')
  headers.delete('Set-Cookie')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
