import { requireCurrentUser } from '../../../lib/auth'
import { createTranscriptBookmark, listTranscriptBookmarks } from '../../../lib/personal'
import { jsonError, jsonResponse, readJsonBody, requireDb } from '../../../lib/http'
import type { FunctionContext } from '../../../lib/types'

interface BookmarkBody {
  episodeId?: number
  transcriptId?: string
  cueIndex?: number
  note?: string
  cueText?: string
  cueStartTime?: number
  cueEndTime?: number
  episodeTitle?: string
  podcastTitle?: string
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  if (request.method === 'GET') {
    return jsonResponse({ bookmarks: await listTranscriptBookmarks(env.DB!, current.user.id) }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (request.method === 'POST') {
    const body = await readJsonBody<BookmarkBody>(request)
    if (body instanceof Response) return body
    if (!body.episodeId) return jsonError('Missing episodeId', 400)

    const bookmark = await createTranscriptBookmark(env.DB!, current.user.id, {
      episodeId: body.episodeId,
      transcriptId: body.transcriptId,
      cueIndex: body.cueIndex,
      note: body.note,
      cueText: body.cueText,
      cueStartTime: body.cueStartTime,
      cueEndTime: body.cueEndTime,
      episodeTitle: body.episodeTitle,
      podcastTitle: body.podcastTitle,
    })

    return jsonResponse({ bookmark }, { status: 201 })
  }

  return jsonError('Method not allowed', 405)
}
