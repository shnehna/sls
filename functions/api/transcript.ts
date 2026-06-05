interface TranscriptContext {
  request: Request
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()

  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '0.0.0.0') return true
  if (host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.')) return true
  if (host.startsWith('169.254.')) return true

  const parts = host.split('.').map((part) => Number(part))
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    const [first, second] = parts
    if (first === 172 && second >= 16 && second <= 31) return true
  }

  return false
}

export const onRequest = async ({ request }: TranscriptContext): Promise<Response> => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonError('Method not allowed', 405)
  }

  const requestUrl = new URL(request.url)
  const transcriptUrl = requestUrl.searchParams.get('url')

  if (!transcriptUrl) {
    return jsonError('Missing transcript url', 400)
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(transcriptUrl)
  } catch {
    return jsonError('Invalid transcript url', 400)
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return jsonError('Only http and https transcript urls are allowed', 400)
  }

  if (isBlockedHostname(targetUrl.hostname)) {
    return jsonError('Transcript host is not allowed', 400)
  }

  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: {
      'User-Agent': 'ShadowCast/1.0',
      Accept: 'text/plain,text/vtt,application/json,text/html,*/*',
    },
  })

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
