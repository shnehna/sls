import { jsonError, jsonResponse, requireDb } from '../../lib/http'
import { listPodcastSaveCounts } from '../../lib/personal'
import type { FunctionContext } from '../../lib/types'

function parsePodcastIds(value: string | null): number[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 100)
}

export const onRequest = async ({ request, env }: FunctionContext): Promise<Response> => {
  if (request.method !== 'GET') {
    return jsonError('Method not allowed', 405)
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const url = new URL(request.url)
  const podcastIds = parsePodcastIds(url.searchParams.get('ids'))
  const counts = await listPodcastSaveCounts(env.DB!, podcastIds)

  return jsonResponse({ counts }, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  })
}
