import { getNumericParam, jsonError, jsonResponse, readJsonBody, requireDb } from '../../../../lib/http'
import { parseAllowedRemoteUrl } from '../../../../lib/security'
import { saveTranscript } from '../../../../lib/transcripts'
import type { FunctionContext } from '../../../../lib/types'
import { parseTranscript } from '../../../../../shared/transcript'
import type { TranscriptFileType } from '../../../../../shared/types'

interface Params {
  episodeId?: string | string[]
}

interface ImportBody {
  url?: string
  type?: TranscriptFileType
  episodeGuid?: string
  audioUrl?: string
  provider?: string
  sourceKind?: 'podcast_index_remote' | 'imported_remote'
  language?: string
}

export const onRequest = async ({ request, env, params }: FunctionContext<Params>): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  const dbError = requireDb(env)
  if (dbError) return dbError

  const episodeId = getNumericParam(params.episodeId, 'episode id')
  if (episodeId instanceof Response) return episodeId

  const body = await readJsonBody<ImportBody>(request)
  if (body instanceof Response) return body

  if (!body.url) return jsonError('Missing transcript url', 400)
  if (!body.audioUrl) return jsonError('Missing audioUrl', 400)

  const remoteUrl = parseAllowedRemoteUrl(body.url, 'transcript url')
  if (remoteUrl instanceof Response) return remoteUrl

  const type = body.type || 'text/plain'
  const upstream = await fetch(remoteUrl.toString(), {
    headers: {
      'User-Agent': 'ShadowCast/1.0',
      Accept: 'text/plain,text/vtt,application/json,text/html,*/*',
    },
  })

  if (!upstream.ok) {
    return jsonError(`Transcript fetch failed: ${upstream.status} ${upstream.statusText}`, upstream.status)
  }

  const raw = await upstream.text()
  const cues = parseTranscript(raw, type)
  if (cues.length === 0) {
    return jsonError('Transcript did not contain parseable cues', 422)
  }

  const transcript = await saveTranscript(env.DB!, {
    episodeId,
    episodeGuid: body.episodeGuid,
    audioUrl: body.audioUrl,
    sourceKind: body.sourceKind || 'podcast_index_remote',
    sourceUrl: remoteUrl.toString(),
    provider: body.provider || 'podcast_index',
    language: body.language,
    format: type,
    cues,
  })

  return jsonResponse({ ok: true, transcriptId: transcript.id, cueCount: cues.length, transcript })
}
