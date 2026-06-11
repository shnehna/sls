import type { Env } from './types'

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

export function requireDb(env: Env): Response | null {
  if (!env.DB) return jsonError('D1 database binding DB is not configured', 500)
  return null
}

export async function readJsonBody<T>(request: Request): Promise<T | Response> {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return jsonError('Expected application/json body', 415)
  }

  try {
    return await request.json() as T
  } catch {
    return jsonError('Invalid JSON body', 400)
  }
}

export function getNumericParam(value: string | string[] | undefined, name: string): number | Response {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = raw ? Number(raw) : Number.NaN
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return jsonError(`Invalid ${name}`, 400)
  }
  return parsed
}

export function getStringParam(value: string | string[] | undefined, name: string): string | Response {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return jsonError(`Missing ${name}`, 400)
  return raw
}
