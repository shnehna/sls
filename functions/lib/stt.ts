import type { Env } from './types'
import type { TranscriptCue, TranscriptionJobStatus } from '../../shared/types'

export interface SubmitTranscriptionInput {
  jobId: string
  audioUrl: string
  episodeGuid?: string
  language?: string
  requestedProvider?: string
}

export interface SubmitTranscriptionResult {
  provider: string
  providerJobId?: string
  providerStatus: string
  status: TranscriptionJobStatus
  requestPayload: unknown
}

export interface ParsedWebhookPayload {
  provider: string
  jobId?: string
  providerJobId?: string
  providerStatus?: string
  status: 'completed' | 'failed'
  cues: TranscriptCue[]
  language?: string
  errorMessage?: string
  raw: unknown
}

type JsonRecord = Record<string, unknown>

export function getConfiguredProvider(env: Env, requestedProvider?: string): string {
  if (requestedProvider && requestedProvider !== 'auto') return requestedProvider.toLowerCase()
  if (env.STT_PROVIDER) return env.STT_PROVIDER.toLowerCase()
  return env.DEEPGRAM_API_KEY ? 'deepgram' : 'mock'
}

export async function submitTranscription(env: Env, input: SubmitTranscriptionInput): Promise<SubmitTranscriptionResult> {
  const provider = getConfiguredProvider(env, input.requestedProvider)

  if (provider === 'manual') {
    return {
      provider,
      providerStatus: 'awaiting_upload',
      status: 'awaiting_upload',
      requestPayload: { provider, language: input.language },
    }
  }

  if (provider === 'mock') {
    return {
      provider,
      providerJobId: `mock-${input.jobId}`,
      providerStatus: 'mock_submitted',
      status: 'processing',
      requestPayload: { provider, audioUrl: input.audioUrl, language: input.language },
    }
  }

  if (provider === 'deepgram') {
    return submitDeepgramTranscription(env, input)
  }

  throw new Error(`Unsupported STT provider: ${provider}`)
}

export async function parseWebhookPayload(provider: string, request: Request, env: Env): Promise<ParsedWebhookPayload | Response> {
  const normalizedProvider = provider.toLowerCase()
  const authError = verifyWebhookSecret(request, env)
  if (authError) return authError

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid webhook JSON body' }, { status: 400 })
  }

  if (normalizedProvider === 'mock') {
    return parseMockWebhook(request, payload)
  }

  if (normalizedProvider === 'deepgram') {
    return parseDeepgramWebhook(request, payload)
  }

  return Response.json({ error: `Unsupported STT webhook provider: ${provider}` }, { status: 400 })
}

async function submitDeepgramTranscription(env: Env, input: SubmitTranscriptionInput): Promise<SubmitTranscriptionResult> {
  if (!env.DEEPGRAM_API_KEY) throw new Error('DEEPGRAM_API_KEY is not configured')

  const callback = buildCallbackUrl(env, 'deepgram', input.jobId)
  if (!callback) throw new Error('STT_CALLBACK_BASE_URL is required for Deepgram webhook transcription')

  const params = new URLSearchParams({
    model: env.DEEPGRAM_MODEL || 'nova-3',
    smart_format: 'true',
    punctuate: 'true',
    diarize: 'true',
    utterances: 'true',
    paragraphs: 'true',
    callback,
  })

  if (input.language) params.set('language', input.language)

  const endpoint = `https://api.deepgram.com/v1/listen?${params.toString()}`
  const body = { url: input.audioUrl }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const responseJson = await readJson(response)
  if (!response.ok) {
    throw new Error(extractErrorMessage(responseJson) || `Deepgram request failed: ${response.status}`)
  }

  const responseRecord = asRecord(responseJson)
  const metadata = asRecord(responseRecord?.metadata)
  const providerJobId = stringValue(responseRecord?.request_id) || stringValue(metadata?.request_id) || input.jobId

  return {
    provider: 'deepgram',
    providerJobId,
    providerStatus: 'submitted_with_callback',
    status: 'awaiting_webhook',
    requestPayload: {
      provider: 'deepgram',
      endpoint: 'https://api.deepgram.com/v1/listen',
      query: Object.fromEntries(params),
      request: body,
      response: responseJson,
    },
  }
}

function buildCallbackUrl(env: Env, provider: string, jobId: string): string | null {
  if (!env.STT_CALLBACK_BASE_URL) return null
  const url = new URL(`/api/transcription-webhooks/${provider}`, env.STT_CALLBACK_BASE_URL)
  url.searchParams.set('jobId', jobId)
  if (env.STT_WEBHOOK_SECRET) url.searchParams.set('token', env.STT_WEBHOOK_SECRET)
  return url.toString()
}

function verifyWebhookSecret(request: Request, env: Env): Response | null {
  if (!env.STT_WEBHOOK_SECRET) return null
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || request.headers.get('x-shadowcast-stt-secret')
  if (token === env.STT_WEBHOOK_SECRET) return null
  return Response.json({ error: 'Invalid STT webhook secret' }, { status: 401 })
}

function parseMockWebhook(request: Request, payload: unknown): ParsedWebhookPayload {
  const record = asRecord(payload)
  const cues = normalizeWebhookCues(record?.cues)
  const url = new URL(request.url)
  const jobId = stringValue(record?.jobId) || url.searchParams.get('jobId') || undefined
  const providerJobId = stringValue(record?.providerJobId) || (jobId ? `mock-${jobId}` : undefined)
  const errorMessage = stringValue(record?.error) || stringValue(record?.errorMessage)

  return {
    provider: 'mock',
    jobId,
    providerJobId,
    providerStatus: errorMessage ? 'mock_failed' : 'mock_completed',
    status: errorMessage ? 'failed' : 'completed',
    cues,
    language: stringValue(record?.language),
    errorMessage,
    raw: payload,
  }
}

function parseDeepgramWebhook(request: Request, payload: unknown): ParsedWebhookPayload {
  const record = asRecord(payload)
  const metadata = asRecord(record?.metadata)
  const url = new URL(request.url)
  const errorMessage = extractErrorMessage(payload)
  const providerJobId = stringValue(metadata?.request_id) || stringValue(record?.request_id)
  const cues = errorMessage ? [] : deepgramToCues(payload)
  const language = detectDeepgramLanguage(payload)

  return {
    provider: 'deepgram',
    jobId: url.searchParams.get('jobId') || undefined,
    providerJobId,
    providerStatus: errorMessage ? 'failed' : 'completed',
    status: errorMessage ? 'failed' : 'completed',
    cues,
    language,
    errorMessage,
    raw: payload,
  }
}

function deepgramToCues(payload: unknown): TranscriptCue[] {
  const results = asRecord(asRecord(payload)?.results)
  const utterances = asArray(results?.utterances)

  if (utterances.length > 0) {
    return utterances
      .map((utterance, index) => {
        const record = asRecord(utterance)
        const text = stringValue(record?.transcript)?.trim() || ''
        return {
          id: index,
          startTime: numberValue(record?.start, 0),
          endTime: numberValue(record?.end, numberValue(record?.start, 0)),
          text,
          speaker: speakerLabel(record?.speaker),
        }
      })
      .filter((cue) => cue.text.length > 0)
  }

  const paragraphCues = deepgramParagraphCues(results)
  if (paragraphCues.length > 0) return paragraphCues

  const words = deepgramWords(results)
  return wordsToCues(words)
}

function deepgramParagraphCues(results: JsonRecord | null): TranscriptCue[] {
  const channels = asArray(results?.channels)
  const alternatives = asArray(asRecord(channels[0])?.alternatives)
  const paragraphs = asArray(asRecord(asRecord(alternatives[0])?.paragraphs)?.paragraphs)
  const cues: TranscriptCue[] = []

  paragraphs.forEach((paragraph) => {
    const paragraphRecord = asRecord(paragraph)
    const sentences = asArray(paragraphRecord?.sentences)
    sentences.forEach((sentence) => {
      const sentenceRecord = asRecord(sentence)
      const text = stringValue(sentenceRecord?.text)?.trim() || ''
      if (!text) return
      cues.push({
        id: cues.length,
        startTime: numberValue(sentenceRecord?.start, numberValue(paragraphRecord?.start, 0)),
        endTime: numberValue(sentenceRecord?.end, numberValue(paragraphRecord?.end, 0)),
        text,
        speaker: speakerLabel(paragraphRecord?.speaker),
      })
    })
  })

  return cues
}

function deepgramWords(results: JsonRecord | null): Array<{ word: string; start: number; end: number; speaker?: string }> {
  const channels = asArray(results?.channels)
  const alternatives = asArray(asRecord(channels[0])?.alternatives)
  const words = asArray(asRecord(alternatives[0])?.words)

  return words
    .map((word) => {
      const record = asRecord(word)
      return {
        word: stringValue(record?.punctuated_word) || stringValue(record?.word) || '',
        start: numberValue(record?.start, 0),
        end: numberValue(record?.end, 0),
        speaker: speakerLabel(record?.speaker),
      }
    })
    .filter((word) => word.word.length > 0)
}

function wordsToCues(words: Array<{ word: string; start: number; end: number; speaker?: string }>): TranscriptCue[] {
  const cues: TranscriptCue[] = []
  let current: typeof words = []
  let currentSpeaker: string | undefined

  const flush = () => {
    if (current.length === 0) return
    cues.push({
      id: cues.length,
      startTime: current[0]!.start,
      endTime: current[current.length - 1]!.end,
      text: current.map((word) => word.word).join(' '),
      speaker: currentSpeaker,
    })
    current = []
    currentSpeaker = undefined
  }

  words.forEach((word) => {
    const elapsed = current.length > 0 ? word.end - current[0]!.start : 0
    const speakerChanged = currentSpeaker && word.speaker && currentSpeaker !== word.speaker
    if (speakerChanged || elapsed >= 8) flush()
    if (current.length === 0) currentSpeaker = word.speaker
    current.push(word)
    if (/[.!?]$/.test(word.word)) flush()
  })

  flush()
  return cues
}

function normalizeWebhookCues(value: unknown): TranscriptCue[] {
  return asArray(value)
    .map((cue, index) => {
      const record = asRecord(cue)
      const startTime = numberValue(record?.startTime ?? record?.start, 0)
      const endTime = numberValue(record?.endTime ?? record?.end, startTime)
      return {
        id: index,
        startTime,
        endTime,
        text: stringValue(record?.text ?? record?.transcript)?.trim() || '',
        speaker: stringValue(record?.speaker),
      }
    })
    .filter((cue) => cue.text.length > 0)
}

function detectDeepgramLanguage(payload: unknown): string | undefined {
  const results = asRecord(asRecord(payload)?.results)
  const channels = asArray(results?.channels)
  return stringValue(asRecord(channels[0])?.detected_language)
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function extractErrorMessage(value: unknown): string | undefined {
  const record = asRecord(value)
  return stringValue(record?.error) || stringValue(record?.err_msg) || stringValue(record?.message)
}

function speakerLabel(value: unknown): string | undefined {
  const speaker = stringValue(value)
  return speaker ? `Speaker ${speaker}` : undefined
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
