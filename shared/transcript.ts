import type { Person, TranscriptCue } from './types'

/**
 * Parse transcript content in SRT, VTT, JSON, HTML, or plain text into TranscriptCue[].
 * Also extracts speaker labels from text patterns like "[Speaker]: text".
 */
export function parseTranscript(
  raw: string,
  type: string,
  persons?: Person[]
): TranscriptCue[] {
  if (type === 'application/json') {
    return normalizeCues(parseJsonTranscript(raw))
  }
  if (type === 'text/vtt') {
    return parseVtt(raw, persons)
  }
  if (type === 'application/srt' || type === 'text/srt') {
    return parseSrt(raw, persons)
  }
  if (type === 'text/html') {
    return parseHtmlTranscript(raw)
  }
  return parsePlainText(raw)
}

export function normalizeCues(cues: Array<Partial<TranscriptCue>>): TranscriptCue[] {
  return cues
    .map((cue, index) => ({
      id: index,
      startTime: toNumber(cue.startTime, 0),
      endTime: toNumber(cue.endTime, toNumber(cue.startTime, 0)),
      text: String(cue.text ?? '').trim(),
      speaker: cue.speaker ? String(cue.speaker).trim() : undefined,
    }))
    .filter((cue) => cue.text.length > 0)
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// ==================== VTT Parser ====================

function parseVtt(raw: string, persons?: Person[]): TranscriptCue[] {
  const cues: TranscriptCue[] = []
  const lines = raw.replace(/^WEBVTT.*\n/, '').split('\n')

  let i = 0
  let cueIndex = 0

  while (i < lines.length) {
    const line = lines[i]!.trim()

    if (line === '' || line.startsWith('NOTE')) {
      i++
      continue
    }

    if (line.startsWith('STYLE') || line.startsWith('REGION')) {
      i++
      continue
    }

    const timeMatch = line.match(
      /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/
    )

    if (timeMatch) {
      const start = parseVttTime(timeMatch[1]!)
      const end = parseVttTime(timeMatch[2]!)
      i++

      const textLines: string[] = []
      while (i < lines.length && lines[i]!.trim() !== '') {
        textLines.push(lines[i]!.trim())
        i++
      }

      const fullText = textLines.join(' ')
      const { speaker, text } = extractSpeaker(fullText)

      cues.push({
        id: cueIndex++,
        startTime: start,
        endTime: end,
        text: text || fullText,
        speaker: speaker || findSpeakerFromPersons(cueIndex, persons),
      })
    } else {
      i++
    }
  }

  return mergeConsecutiveSpeakerCues(cues)
}

function parseVttTime(time: string): number {
  const parts = time.split(':')
  if (parts.length === 3) {
    return parseInt(parts[0]!) * 3600 + parseInt(parts[1]!) * 60 + parseFloat(parts[2]!)
  }
  return parseInt(parts[0]!) * 60 + parseFloat(parts[1]!)
}

// ==================== SRT Parser ====================

function parseSrt(raw: string, persons?: Person[]): TranscriptCue[] {
  const cues: TranscriptCue[] = []
  const blocks = raw.trim().split(/\n\s*\n/)

  let cueIndex = 0
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    const timeLine = lines[1]!.trim()
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    )

    if (!timeMatch) continue

    const start = parseSrtTime(timeMatch[1]!)
    const end = parseSrtTime(timeMatch[2]!)
    const fullText = lines.slice(2).join(' ').trim()
    const { speaker, text } = extractSpeaker(fullText)

    cues.push({
      id: cueIndex++,
      startTime: start,
      endTime: end,
      text: text || fullText,
      speaker: speaker || findSpeakerFromPersons(cueIndex, persons),
    })
  }

  return mergeConsecutiveSpeakerCues(cues)
}

function parseSrtTime(time: string): number {
  const normalized = time.replace(',', '.')
  const parts = normalized.split(':')
  return parseInt(parts[0]!) * 3600 + parseInt(parts[1]!) * 60 + parseFloat(parts[2]!)
}

// ==================== JSON Parser ====================

function parseJsonTranscript(raw: string): TranscriptCue[] {
  try {
    const data = JSON.parse(raw)

    if (data.segments && Array.isArray(data.segments)) {
      return data.segments.map((seg: Record<string, unknown>, idx: number) => ({
        id: idx,
        startTime: Number(seg.startTime ?? seg.start ?? 0),
        endTime: Number(seg.endTime ?? seg.end ?? 0),
        text: String(seg.body ?? seg.text ?? ''),
        speaker: String(seg.speaker ?? '') || undefined,
      }))
    }

    if (Array.isArray(data)) {
      return data.map((cue: Record<string, unknown>, idx: number) => ({
        id: idx,
        startTime: Number(cue.startTime ?? cue.start ?? 0),
        endTime: Number(cue.endTime ?? cue.end ?? 0),
        text: String(cue.text ?? cue.body ?? cue.content ?? ''),
        speaker: typeof cue.speaker === 'string' ? cue.speaker : undefined,
      }))
    }

    return []
  } catch {
    return []
  }
}

// ==================== HTML Parser ====================

function parseHtmlTranscript(raw: string): TranscriptCue[] {
  const textOnly = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  const lines = textOnly.split('\n').filter((line) => line.trim())
  return lines.map((line, idx) => {
    const { speaker, text } = extractSpeaker(line.trim())
    return {
      id: idx,
      startTime: idx * 5,
      endTime: (idx + 1) * 5,
      text: text || line.trim(),
      speaker,
    }
  })
}

// ==================== Plain Text Parser ====================

function parsePlainText(raw: string): TranscriptCue[] {
  const lines = raw.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  return lines.map((line, idx) => {
    const { speaker, text } = extractSpeaker(line.trim())
    return {
      id: idx,
      startTime: idx * 5,
      endTime: (idx + 1) * 5,
      text: text || line.trim(),
      speaker,
    }
  })
}

// ==================== Speaker Extraction ====================

function extractSpeaker(text: string): { speaker?: string; text: string } {
  const bracketMatch = text.match(/^\[([^\]]+)\]:\s*(.+)/)
  if (bracketMatch) {
    return { speaker: bracketMatch[1]!, text: bracketMatch[2]! }
  }

  const colonMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?):\s*(.+)/)
  if (colonMatch) {
    return { speaker: colonMatch[1]!, text: colonMatch[2]! }
  }

  const vMatch = text.match(/<v\s+([^>]+)>([^<]*)<\/v>/)
  if (vMatch) {
    return { speaker: vMatch[1]!, text: vMatch[2]! }
  }

  return { text }
}

function findSpeakerFromPersons(
  _cueIndex: number,
  persons?: Person[]
): string | undefined {
  if (!persons || persons.length === 0) return undefined
  const speaker = persons.find(
    (p) =>
      p.role?.toLowerCase().includes('host') ||
      p.role?.toLowerCase().includes('speaker') ||
      p.group?.toLowerCase() === 'cast'
  )
  return speaker?.name
}

function mergeConsecutiveSpeakerCues(cues: TranscriptCue[]): TranscriptCue[] {
  if (cues.length <= 1) return cues

  const merged: TranscriptCue[] = []
  let current = { ...cues[0]! }

  for (let i = 1; i < cues.length; i++) {
    const next = cues[i]!
    if (current.speaker === next.speaker && current.speaker !== undefined) {
      current.endTime = next.endTime
      current.text += ' ' + next.text
    } else {
      merged.push(current)
      current = { ...next }
    }
  }
  merged.push(current)
  return merged.map((cue, index) => ({ ...cue, id: index }))
}

// ==================== Cue Navigation ====================

export function findActiveCueIndex(
  cues: TranscriptCue[],
  currentTime: number
): number {
  const idx = cues.findIndex(
    (cue) => currentTime >= cue.startTime && currentTime < cue.endTime
  )
  return idx >= 0 ? idx : cues.length > 0 ? -1 : 0
}

export function findCueIndexAtTime(
  cues: TranscriptCue[],
  time: number
): number {
  return cues.findIndex((cue) => time >= cue.startTime && time < cue.endTime)
}
