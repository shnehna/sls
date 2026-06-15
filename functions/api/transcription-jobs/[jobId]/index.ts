import { requireCurrentUser } from '../../../lib/auth'
import { getJobForUser } from '../../../lib/transcripts'
import { getStringParam, jsonError, jsonResponse, requireDb } from '../../../lib/http'
import type { FunctionContext } from '../../../lib/types'

interface Params {
  jobId?: string | string[]
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonError('Method not allowed', 405)
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const current = await requireCurrentUser(request, env)
  if (current instanceof Response) return current

  const jobId = getStringParam(params.jobId, 'job id')
  if (jobId instanceof Response) return jobId

  const job = await getJobForUser(env.DB!, jobId, current.user.id)
  if (!job) return jsonError('Job not found', 404)

  return jsonResponse({ job }, { headers: { 'Cache-Control': 'no-store' } })
}
