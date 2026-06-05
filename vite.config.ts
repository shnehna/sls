import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

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

export default defineConfig(({ mode }) => {
  const env = loadRawEnv(mode)
  const apiKey = env.PODCAST_INDEX_KEY || ''
  const apiSecret = env.PODCAST_INDEX_SECRET || ''

  if (!apiKey || !apiSecret) {
    console.warn('PodcastIndex credentials are missing. Add PODCAST_INDEX_KEY and PODCAST_INDEX_SECRET to .env.local.')
  }

  return {
    plugins: [react(), authDebugProxy(apiKey, apiSecret), transcriptProxy()],
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
