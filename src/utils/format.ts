/**
 * Format seconds to display time: HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

/**
 * Format a unix timestamp to relative time string.
 */
export function timeAgo(unixTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - unixTimestamp

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(unixTimestamp * 1000).toLocaleDateString()
}

/**
 * Format a unix timestamp to a pretty date string.
 */
export function formatDate(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength = 150): string {
  if (!text) return ''
  const cleaned = cleanHtml(text)
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Format duration in seconds to human readable.
 */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

/**
 * Clean HTML entities from text.
 */
export function cleanHtml(text: string): string {
  return text
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get a color for a speaker name (deterministic hash).
 */
export function speakerColor(name: string): string {
  const colors = [
    '#60a5fa', // blue
    '#34d399', // green
    '#f472b6', // pink
    '#fbbf24', // yellow
    '#a78bfa', // purple
    '#fb923c', // orange
    '#2dd4bf', // teal
    '#f87171', // red
    '#818cf8', // indigo
    '#a3e635', // lime
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]!
}
