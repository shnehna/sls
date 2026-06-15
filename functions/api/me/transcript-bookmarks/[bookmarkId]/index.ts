import { requireCurrentUser } from '../../../../lib/auth'
import { deleteTranscriptBookmark } from '../../../../lib/personal'
import { getStringParam, jsonError, jsonResponse, requireDb } from '../../../../lib/http'
import type { FunctionContext } from '../../../../lib/types'

interface Params {
  bookmarkId?: string | string[]
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'DELETE') return jsonError('Method not allowed', 405)

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const bookmarkId = getStringParam(params.bookmarkId, 'bookmark id')
  if (bookmarkId instanceof Response) return bookmarkId

  await deleteTranscriptBookmark(env.DB!, current.user.id, bookmarkId)
  return jsonResponse({ ok: true })
}
