import { requireCurrentUser } from '../lib/auth'
import { jsonError } from '../lib/http'
import { parseAllowedRemoteUrl } from '../lib/security'
import type { FunctionContext } from '../lib/types'

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonError('Method not allowed', 405)
  }

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const requestUrl = new URL(request.url)
  const transcriptUrl = requestUrl.searchParams.get('url')

  if (!transcriptUrl) {
    return jsonError('Missing transcript url', 400)
  }

  const targetUrl = parseAllowedRemoteUrl(transcriptUrl, 'transcript url')
  if (targetUrl instanceof Response) return targetUrl

  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: {
      'User-Agent': 'ShadowCast/1.0',
      Accept: 'text/plain,text/vtt,application/json,text/html,*/*',
    },
  })

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8')
  headers.set('Cache-Control', 'private, max-age=86400')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
