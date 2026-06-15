import type { D1Database } from './types'

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function optionalString(value: string | null): string | undefined {
  return value ?? undefined
}

export interface SavedPodcastInput {
  podcastId: number
  title?: string
  image?: string
  url?: string
  author?: string
}

export interface SavedPodcastItem {
  id: string
  podcastId: number
  title?: string
  image?: string
  url?: string
  author?: string
  createdAt: string
  updatedAt: string
}

interface SavedPodcastRow {
  id: string
  podcast_id: number
  podcast_title: string | null
  podcast_image: string | null
  podcast_url: string | null
  podcast_author: string | null
  created_at: string
  updated_at: string
}

export interface ProgressInput {
  episodeId: number
  podcastId?: number
  positionSeconds: number
  durationSeconds?: number
  episodeTitle?: string
  episodeImage?: string
  podcastTitle?: string
  podcastImage?: string
}

export interface EpisodeProgressItem {
  id: string
  episodeId: number
  podcastId?: number
  positionSeconds: number
  durationSeconds?: number
  completedAt?: string
  episodeTitle?: string
  episodeImage?: string
  podcastTitle?: string
  podcastImage?: string
  createdAt: string
  updatedAt: string
}

interface ProgressRow {
  id: string
  episode_id: number
  podcast_id: number | null
  position_seconds: number
  duration_seconds: number | null
  completed_at: string | null
  episode_title: string | null
  episode_image: string | null
  podcast_title: string | null
  podcast_image: string | null
  created_at: string
  updated_at: string
}

export interface BookmarkInput {
  episodeId: number
  transcriptId?: string
  cueIndex?: number
  note?: string
  cueText?: string
  cueStartTime?: number
  cueEndTime?: number
  episodeTitle?: string
  podcastTitle?: string
}

export interface TranscriptBookmarkItem {
  id: string
  episodeId: number
  transcriptId?: string
  cueIndex?: number
  note?: string
  cueText?: string
  cueStartTime?: number
  cueEndTime?: number
  episodeTitle?: string
  podcastTitle?: string
  createdAt: string
  updatedAt: string
}

interface BookmarkRow {
  id: string
  episode_id: number
  transcript_id: string | null
  cue_index: number | null
  note: string | null
  cue_text: string | null
  cue_start_time: number | null
  cue_end_time: number | null
  episode_title: string | null
  podcast_title: string | null
  created_at: string
  updated_at: string
}

export interface LibrarySummary {
  savedPodcasts: SavedPodcastItem[]
  recentProgress: EpisodeProgressItem[]
  recentBookmarks: TranscriptBookmarkItem[]
  stats: {
    savedPodcastCount: number
    inProgressEpisodeCount: number
    bookmarkCount: number
    lastPracticeAt?: string
  }
}

function mapSavedPodcast(row: SavedPodcastRow): SavedPodcastItem {
  return {
    id: row.id,
    podcastId: row.podcast_id,
    title: optionalString(row.podcast_title),
    image: optionalString(row.podcast_image),
    url: optionalString(row.podcast_url),
    author: optionalString(row.podcast_author),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProgress(row: ProgressRow): EpisodeProgressItem {
  return {
    id: row.id,
    episodeId: row.episode_id,
    podcastId: row.podcast_id ?? undefined,
    positionSeconds: row.position_seconds,
    durationSeconds: row.duration_seconds ?? undefined,
    completedAt: optionalString(row.completed_at),
    episodeTitle: optionalString(row.episode_title),
    episodeImage: optionalString(row.episode_image),
    podcastTitle: optionalString(row.podcast_title),
    podcastImage: optionalString(row.podcast_image),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapBookmark(row: BookmarkRow): TranscriptBookmarkItem {
  return {
    id: row.id,
    episodeId: row.episode_id,
    transcriptId: optionalString(row.transcript_id),
    cueIndex: row.cue_index ?? undefined,
    note: optionalString(row.note),
    cueText: optionalString(row.cue_text),
    cueStartTime: row.cue_start_time ?? undefined,
    cueEndTime: row.cue_end_time ?? undefined,
    episodeTitle: optionalString(row.episode_title),
    podcastTitle: optionalString(row.podcast_title),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listSavedPodcasts(db: D1Database, userId: string, limit = 50): Promise<SavedPodcastItem[]> {
  const rows = await db.prepare(`
    SELECT * FROM user_saved_podcasts
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(userId, limit).all<SavedPodcastRow>()
  return (rows.results || []).map(mapSavedPodcast)
}

export async function savePodcast(db: D1Database, userId: string, input: SavedPodcastInput): Promise<SavedPodcastItem> {
  const timestamp = nowIso()
  const existing = await db.prepare(`
    SELECT * FROM user_saved_podcasts
    WHERE user_id = ? AND podcast_id = ?
    LIMIT 1
  `).bind(userId, input.podcastId).first<SavedPodcastRow>()

  if (existing) {
    await db.prepare(`
      UPDATE user_saved_podcasts
      SET podcast_title = ?, podcast_image = ?, podcast_url = ?, podcast_author = ?, updated_at = ?
      WHERE id = ?
    `).bind(input.title || null, input.image || null, input.url || null, input.author || null, timestamp, existing.id).run()
  } else {
    await db.prepare(`
      INSERT INTO user_saved_podcasts (
        id, user_id, podcast_id, podcast_title, podcast_image, podcast_url, podcast_author, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(uid('saved'), userId, input.podcastId, input.title || null, input.image || null, input.url || null, input.author || null, timestamp, timestamp).run()
  }

  const row = await db.prepare(`
    SELECT * FROM user_saved_podcasts
    WHERE user_id = ? AND podcast_id = ?
    LIMIT 1
  `).bind(userId, input.podcastId).first<SavedPodcastRow>()
  if (!row) throw new Error('Failed to save podcast')
  return mapSavedPodcast(row)
}

export async function removeSavedPodcast(db: D1Database, userId: string, podcastId: number): Promise<void> {
  await db.prepare('DELETE FROM user_saved_podcasts WHERE user_id = ? AND podcast_id = ?')
    .bind(userId, podcastId)
    .run()
}

export async function listEpisodeProgress(db: D1Database, userId: string, limit = 50): Promise<EpisodeProgressItem[]> {
  const rows = await db.prepare(`
    SELECT * FROM user_episode_progress
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(userId, limit).all<ProgressRow>()
  return (rows.results || []).map(mapProgress)
}

export async function getEpisodeProgress(db: D1Database, userId: string, episodeId: number): Promise<EpisodeProgressItem | null> {
  const row = await db.prepare(`
    SELECT * FROM user_episode_progress
    WHERE user_id = ? AND episode_id = ?
    LIMIT 1
  `).bind(userId, episodeId).first<ProgressRow>()
  return row ? mapProgress(row) : null
}

export async function upsertEpisodeProgress(db: D1Database, userId: string, input: ProgressInput): Promise<EpisodeProgressItem> {
  const timestamp = nowIso()
  const duration = input.durationSeconds || null
  const completedAt = duration && duration > 0 && input.positionSeconds / duration >= 0.95 ? timestamp : null
  const existing = await getEpisodeProgress(db, userId, input.episodeId)

  if (existing) {
    await db.prepare(`
      UPDATE user_episode_progress
      SET podcast_id = ?, position_seconds = ?, duration_seconds = ?, completed_at = ?,
          episode_title = ?, episode_image = ?, podcast_title = ?, podcast_image = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      input.podcastId || null,
      input.positionSeconds,
      duration,
      completedAt,
      input.episodeTitle || null,
      input.episodeImage || null,
      input.podcastTitle || null,
      input.podcastImage || null,
      timestamp,
      existing.id
    ).run()
  } else {
    await db.prepare(`
      INSERT INTO user_episode_progress (
        id, user_id, episode_id, podcast_id, position_seconds, duration_seconds, completed_at,
        episode_title, episode_image, podcast_title, podcast_image, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uid('progress'),
      userId,
      input.episodeId,
      input.podcastId || null,
      input.positionSeconds,
      duration,
      completedAt,
      input.episodeTitle || null,
      input.episodeImage || null,
      input.podcastTitle || null,
      input.podcastImage || null,
      timestamp,
      timestamp
    ).run()
  }

  const saved = await getEpisodeProgress(db, userId, input.episodeId)
  if (!saved) throw new Error('Failed to save episode progress')
  return saved
}

export async function listTranscriptBookmarks(db: D1Database, userId: string, limit = 50): Promise<TranscriptBookmarkItem[]> {
  const rows = await db.prepare(`
    SELECT * FROM user_transcript_bookmarks
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(userId, limit).all<BookmarkRow>()
  return (rows.results || []).map(mapBookmark)
}

export async function createTranscriptBookmark(db: D1Database, userId: string, input: BookmarkInput): Promise<TranscriptBookmarkItem> {
  const timestamp = nowIso()
  const id = uid('bookmark')
  await db.prepare(`
    INSERT INTO user_transcript_bookmarks (
      id, user_id, episode_id, transcript_id, cue_index, note, cue_text, cue_start_time, cue_end_time,
      episode_title, podcast_title, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    input.episodeId,
    input.transcriptId || null,
    input.cueIndex ?? null,
    input.note || null,
    input.cueText || null,
    input.cueStartTime ?? null,
    input.cueEndTime ?? null,
    input.episodeTitle || null,
    input.podcastTitle || null,
    timestamp,
    timestamp
  ).run()

  const row = await db.prepare('SELECT * FROM user_transcript_bookmarks WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<BookmarkRow>()
  if (!row) throw new Error('Failed to create bookmark')
  return mapBookmark(row)
}

export async function deleteTranscriptBookmark(db: D1Database, userId: string, bookmarkId: string): Promise<void> {
  await db.prepare('DELETE FROM user_transcript_bookmarks WHERE id = ? AND user_id = ?')
    .bind(bookmarkId, userId)
    .run()
}

export async function getLibrarySummary(db: D1Database, userId: string): Promise<LibrarySummary> {
  const [savedPodcasts, recentProgress, recentBookmarks] = await Promise.all([
    listSavedPodcasts(db, userId, 6),
    listEpisodeProgress(db, userId, 6),
    listTranscriptBookmarks(db, userId, 6),
  ])

  const savedPodcastCount = await db.prepare('SELECT COUNT(*) AS count FROM user_saved_podcasts WHERE user_id = ?')
    .bind(userId)
    .first<{ count: number }>()
  const inProgressEpisodeCount = await db.prepare('SELECT COUNT(*) AS count FROM user_episode_progress WHERE user_id = ?')
    .bind(userId)
    .first<{ count: number }>()
  const bookmarkCount = await db.prepare('SELECT COUNT(*) AS count FROM user_transcript_bookmarks WHERE user_id = ?')
    .bind(userId)
    .first<{ count: number }>()
  const lastPracticeAt = await db.prepare('SELECT MAX(updated_at) AS lastPracticeAt FROM user_episode_progress WHERE user_id = ?')
    .bind(userId)
    .first<{ lastPracticeAt: string | null }>()

  return {
    savedPodcasts,
    recentProgress,
    recentBookmarks,
    stats: {
      savedPodcastCount: savedPodcastCount?.count || 0,
      inProgressEpisodeCount: inProgressEpisodeCount?.count || 0,
      bookmarkCount: bookmarkCount?.count || 0,
      lastPracticeAt: lastPracticeAt?.lastPracticeAt || undefined,
    },
  }
}
