import { requireCurrentUser } from '../../../lib/auth'
import { jsonError, jsonResponse, readJsonBody, requireDb } from '../../../lib/http'
import { listSavedPodcasts, savePodcast } from '../../../lib/personal'
import type { FunctionContext } from '../../../lib/types'

interface SavePodcastBody {
  podcastId?: number
  title?: string
  image?: string
  url?: string
  author?: string
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  if (request.method === 'GET') {
    return jsonResponse({ podcasts: await listSavedPodcasts(env.DB!, current.user.id) }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (request.method === 'POST') {
    const body = await readJsonBody<SavePodcastBody>(request)
    if (body instanceof Response) return body
    if (!body.podcastId) return jsonError('Missing podcastId', 400)

    const podcast = await savePodcast(env.DB!, current.user.id, {
      podcastId: body.podcastId,
      title: body.title,
      image: body.image,
      url: body.url,
      author: body.author,
    })
    return jsonResponse({ podcast }, { status: 201 })
  }

  return jsonError('Method not allowed', 405)
}
