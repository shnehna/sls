interface Env {
  PODCAST_INDEX_KEY?: string
  PODCAST_INDEX_SECRET?: string
}

interface EnvCheckContext {
  env: Env
}

function preview(value?: string): string | null {
  if (!value) return null
  if (value.length <= 8) return `${value.slice(0, 2)}…${value.slice(-2)}`
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export const onRequest = ({ env }: EnvCheckContext): Response => {
  return Response.json({
    hasKey: Boolean(env.PODCAST_INDEX_KEY),
    keyLength: env.PODCAST_INDEX_KEY?.length || 0,
    keyPreview: preview(env.PODCAST_INDEX_KEY),
    hasSecret: Boolean(env.PODCAST_INDEX_SECRET),
    secretLength: env.PODCAST_INDEX_SECRET?.length || 0,
    secretPreview: preview(env.PODCAST_INDEX_SECRET),
  })
}
