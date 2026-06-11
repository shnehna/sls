import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { normalizeCues, parseTranscript } from './shared/transcript'
import type { EpisodeTranscriptResponse, TranscriptCue, TranscriptJob } from './shared/types'

function readRawEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return env

      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) return env

      const key = trimmed.slice(0, equalsIndex).trim()
      let value = trimmed.slice(equalsIndex + 1).trim()

      // Strip matching outer quotes only. Do NOT expand $, because PodcastIndex
      // secrets may legitimately contain dollar signs.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      env[key] = value
      return env
    }, {})
}

function loadRawEnv(mode: string) {
  const cwd = process.cwd()
  return {
    ...process.env,
    ...readRawEnvFile(resolve(cwd, '.env')),
    ...readRawEnvFile(resolve(cwd, `.env.${mode}`)),
    ...readRawEnvFile(resolve(cwd, '.env.local')),
    ...readRawEnvFile(resolve(cwd, `.env.${mode}.local`)),
  }
}

function podcastIndexHeaders(apiKey: string, apiSecret: string) {
  // Match the official Postman pre-request script exactly:
  // const apiHeaderTime = new Date().getTime() / 1000
  const authDate = (Date.now() / 1000).toString()
  const authorization = createHash('sha1')
    .update(apiKey + apiSecret + authDate)
    .digest('hex')

  return {
    'User-Agent': 'ShadowCast/1.0',
    'X-Auth-Date': authDate,
    'X-Auth-Key': apiKey,
    Authorization: authorization,
  }
}

function authDebugProxy(apiKey: string, apiSecret: string): Plugin {
  return {
    name: 'shadowcast-auth-debug',
    configureServer(server) {
      server.middlewares.use('/api/auth-debug', (_req, res) => {
        const headers = apiKey && apiSecret ? podcastIndexHeaders(apiKey, apiSecret) : null
        const authorization = headers?.Authorization || ''
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({
          hasKey: apiKey.length > 0,
          keyPreview: apiKey ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : null,
          hasSecret: apiSecret.length > 0,
          secretLength: apiSecret.length,
          secretContainsDollar: apiSecret.includes('$'),
          authDate: headers?.['X-Auth-Date'] || null,
          authHashPreview: authorization ? `${authorization.slice(0, 8)}…${authorization.slice(-8)}` : null,
          authHashLength: authorization.length,
        }, null, 2))
      })
    },
  }
}

interface DevTranscript {
  episodeId: number
  cues: TranscriptCue[]
  sourceUrl?: string
  audioUrl: string
  createdAt: string
}

interface DevJob extends TranscriptJob {}

const devTranscripts = new Map<number, DevTranscript>()
const devJobs = new Map<string, DevJob>()

function sendJson(res: { setHeader: (name: string, value: string) => void; statusCode: number; end: (body?: string) => void }, data: unknown, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function transcriptProxy(): Plugin {
  return {
    name: 'shadowcast-transcript-proxy',
    configureServer(server) {
      server.middlewares.use('/api/transcript', async (req, res, next) => {
        try {
          const requestUrl = new URL(req.url || '', 'http://localhost')
          const transcriptUrl = requestUrl.searchParams.get('url')

          if (!transcriptUrl) {
            res.statusCode = 400
            res.end('Missing transcript url')
            return
          }

          const upstream = await fetch(transcriptUrl, {
            headers: { 'User-Agent': 'ShadowCast/1.0' },
          })

          if (!upstream.ok) {
            res.statusCode = upstream.status
            res.end(`Transcript fetch failed: ${upstream.statusText}`)
            return
          }

          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/plain; charset=utf-8')
          res.end(await upstream.text())
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

function transcriptIntakeDevApi(): Plugin {
  return {
    name: 'shadowcast-transcript-intake-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/episodes', async (req, res, next) => {
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)
          const episodeId = Number(parts[0])
          if (!Number.isInteger(episodeId)) return next()

          if (req.method === 'GET' && parts[1] === 'transcript' && parts.length === 2) {
            const stored = devTranscripts.get(episodeId)
            if (stored) {
              const response: EpisodeTranscriptResponse = {
                episodeId,
                status: 'ready',
                transcript: {
                  id: `dev-tr-${episodeId}`,
                  episodeId,
                  audioUrl: stored.audioUrl,
                  sourceKind: 'mock',
                  sourceUrl: stored.sourceUrl,
                  provider: 'vite-dev',
                  format: 'normalized',
                  status: 'ready',
                  cueCount: stored.cues.length,
                  version: 1,
                  createdAt: stored.createdAt,
                  updatedAt: stored.createdAt,
                },
                cues: stored.cues,
              }
              sendJson(res, response)
              return
            }
            sendJson(res, { episodeId, status: 'missing', transcript: null, cues: [] } satisfies EpisodeTranscriptResponse)
            return
          }

          if (req.method === 'POST' && parts[1] === 'transcript' && parts[2] === 'import') {
            const body = JSON.parse(await readBody(req)) as { url: string; type: string; audioUrl: string }
            const upstream = await fetch(body.url, { headers: { 'User-Agent': 'ShadowCast/1.0' } })
            if (!upstream.ok) {
              sendJson(res, { error: `Transcript fetch failed: ${upstream.statusText}` }, upstream.status)
              return
            }
            const cues = parseTranscript(await upstream.text(), body.type)
            if (cues.length === 0) {
              sendJson(res, { error: 'Transcript did not contain parseable cues' }, 422)
              return
            }
            devTranscripts.set(episodeId, { episodeId, cues, sourceUrl: body.url, audioUrl: body.audioUrl, createdAt: new Date().toISOString() })
            sendJson(res, { ok: true, transcriptId: `dev-tr-${episodeId}`, cueCount: cues.length })
            return
          }

          if (req.method === 'POST' && parts[1] === 'transcription-jobs') {
            const body = JSON.parse(await readBody(req)) as { audioUrl: string; episodeGuid?: string; provider?: string }
            const timestamp = new Date().toISOString()
            const id = `dev-job-${episodeId}`
            const job: DevJob = {
              id,
              episodeId,
              episodeGuid: body.episodeGuid,
              audioUrl: body.audioUrl,
              provider: body.provider || 'manual',
              status: 'awaiting_upload',
              createdAt: timestamp,
              updatedAt: timestamp,
            }
            devJobs.set(id, job)
            sendJson(res, { job }, 201)
            return
          }

          next()
        } catch (error) {
          next(error)
        }
      })

      server.middlewares.use('/api/transcription-jobs', async (req, res, next) => {
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const parts = url.pathname.split('/').filter(Boolean)
          const jobId = parts[0]
          if (!jobId) return next()
          const job = devJobs.get(jobId)
          if (!job) {
            sendJson(res, { error: 'Job not found' }, 404)
            return
          }

          if (req.method === 'GET' && parts.length === 1) {
            sendJson(res, { job })
            return
          }

          if (req.method === 'POST' && parts[1] === 'complete') {
            const body = JSON.parse(await readBody(req)) as { cues?: Array<Partial<TranscriptCue>>; raw?: string; type?: string }
            const cues = body.cues ? normalizeCues(body.cues) : body.raw && body.type ? parseTranscript(body.raw, body.type) : []
            if (cues.length === 0) {
              sendJson(res, { error: 'Completion payload did not contain parseable cues' }, 422)
              return
            }
            devTranscripts.set(job.episodeId, { episodeId: job.episodeId, cues, audioUrl: job.audioUrl, createdAt: new Date().toISOString() })
            const updated: DevJob = { ...job, status: 'completed', resultTranscriptId: `dev-tr-${job.episodeId}`, updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() }
            devJobs.set(job.id, updated)
            sendJson(res, { ok: true, job: updated, cueCount: cues.length })
            return
          }

          next()
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadRawEnv(mode)
  const apiKey = env.PODCAST_INDEX_KEY || ''
  const apiSecret = env.PODCAST_INDEX_SECRET || ''

  if (!apiKey || !apiSecret) {
    console.warn('PodcastIndex credentials are missing. Add PODCAST_INDEX_KEY and PODCAST_INDEX_SECRET to .env.local.')
  }

  return {
    plugins: [react(), authDebugProxy(apiKey, apiSecret), transcriptProxy(), transcriptIntakeDevApi()],
    server: {
      proxy: {
        '/api/podcastindex': {
          target: 'https://api.podcastindex.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/podcastindex/, '/api/1.0'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (!apiKey || !apiSecret) return
              const headers = podcastIndexHeaders(apiKey, apiSecret)
              Object.entries(headers).forEach(([key, value]) => proxyReq.setHeader(key, value))
            })
          },
        },
      },
      port: 5173,
      host: '0.0.0.0',
    },
  }
})
