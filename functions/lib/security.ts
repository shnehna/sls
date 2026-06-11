export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()

  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '0.0.0.0') return true
  if (host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.')) return true
  if (host.startsWith('169.254.')) return true

  const parts = host.split('.').map((part) => Number(part))
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    const [first, second] = parts
    if (first === 172 && second >= 16 && second <= 31) return true
  }

  return false
}

export function parseAllowedRemoteUrl(rawUrl: string, label = 'url'): URL | Response {
  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return Response.json({ error: `Invalid ${label}` }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return Response.json({ error: 'Only http and https urls are allowed' }, { status: 400 })
  }

  if (isBlockedHostname(targetUrl.hostname)) {
    return Response.json({ error: 'Remote host is not allowed' }, { status: 400 })
  }

  return targetUrl
}
