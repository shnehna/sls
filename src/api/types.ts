// ==================== Podcast Types ====================

export interface PodcastFeed {
  id: number
  podcastGuid?: string
  title: string
  url: string
  originalUrl?: string
  link?: string
  description?: string
  author?: string
  ownerName?: string
  image?: string
  artwork?: string
  lastUpdateTime?: number
  lastCrawlTime?: number
  lastParseTime?: number
  lastGoodHttpStatusTime?: number
  lastHttpStatus?: number
  contentType?: string
  itunesId?: number
  itunesType?: string
  generator?: string
  language?: string
  explicit?: boolean
  type?: number // 0=RSS, 1=Atom
  medium?: string
  dead?: number
  episodeCount?: number
  crawlErrors?: number
  parseErrors?: number
  categories?: Record<string, string>
  locked?: number
  imageUrlHash?: number
  newestItemPubdate?: number
  newestItemPublishTime?: number
  popularity?: number
  value?: ValueBlock
  funding?: Funding
}

export interface ValueBlock {
  model: {
    type: string
    method: string
    suggested: string
  }
  destinations: ValueDestination[]
}

export interface ValueDestination {
  name: string
  address: string
  type: string
  split: number
  fee?: boolean
  customKey?: string
  customValue?: string
}

export interface Funding {
  url: string
  message: string
}

// ==================== Episode Types ====================

export interface Episode {
  id: number
  title: string
  link?: string
  description?: string
  guid?: string
  datePublished?: number
  datePublishedPretty?: string
  dateCrawled?: number
  enclosureUrl: string
  enclosureType?: string
  enclosureLength?: number
  duration?: number
  explicit?: number
  episode?: number
  episodeType?: 'full' | 'trailer' | 'bonus'
  season?: number
  image?: string
  feedItunesId?: number
  feedUrl?: string
  feedImage?: string
  feedId?: number
  feedTitle?: string
  podcastGuid?: string
  feedLanguage?: string
  feedDead?: number
  feedDuplicateOf?: number
  chaptersUrl?: string
  transcriptUrl?: string
  transcripts?: Transcript[]
  persons?: Person[]
  soundbite?: Soundbite
  soundbites?: Soundbite[]
  socialInteract?: SocialInteract[]
  value?: ValueBlock
}

export interface Transcript {
  url: string
  type: 'application/json' | 'application/srt' | 'text/html' | 'text/plain' | 'text/srt' | 'text/vtt'
}

export interface Person {
  id: number
  name: string
  role?: string
  group?: string
  href?: string
  img?: string
}

export interface Soundbite {
  startTime: number
  duration: number
  title: string
}

export interface SocialInteract {
  url: string
  protocol: string
  accountId: string
  accountUrl: string
  priority: number
}

// ==================== Transcript Parser Types ====================

export interface TranscriptCue {
  id: number
  startTime: number   // seconds
  endTime: number      // seconds
  text: string
  speaker?: string     // extracted from text or persons array
}

// ==================== API Response Types ====================

export interface ApiResponse {
  status: 'true' | 'false'
  description?: string
}

export interface SearchResponse extends ApiResponse {
  feeds: PodcastFeed[]
  count: number
  query: string
}

export interface PodcastResponse extends ApiResponse {
  query: { id: string }
  feed: PodcastFeed
}

export interface EpisodesResponse extends ApiResponse {
  items: Episode[]
  liveItems?: Episode[]
  count: number
  query: string
}

export interface EpisodeResponse extends ApiResponse {
  episode: Episode
}

export interface RecentDataResponse extends ApiResponse {
  feedCount: number
  itemCount: number
  max: number
  since: number | null
  nextSince: number
  data: {
    position: number
    feeds: RecentFeedItem[]
    items: RecentEpisodeItem[]
  }
}

export interface RecentFeedItem {
  feedId: number
  feedUrl: string
  feedTitle: string
  feedDescription: string
  feedImage: string
  feedLanguage: string
  feedItunesId: number
}

export interface RecentEpisodeItem {
  episodeId: number
  episodeTitle: string
  episodeDescription: string
  episodeImage: string
  episodeTimestamp: number
  episodeAdded: number
  episodeEnclosureUrl: string
  episodeEnclosureLength: number
  episodeEnclosureType: string
  episodeDuration: number
  episodeType: string
  feedId: number
}

export interface RecentFeedsResponse extends ApiResponse {
  feeds: RecentFeedInfo[]
  count: number
  max: number
  since: number | null
}

export interface RecentFeedInfo {
  id: number
  url: string
  title: string
  newestItemPublishTime: number
  oldestItemPublishTime: number
  itunesId: number
  language: string
  categories: Record<string, string>
}

// ==================== Player Types ====================

export interface PlayerState {
  episode: Episode | null
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  activeCueIndex: number
}

export type PlayerAction =
  | { type: 'SET_EPISODE'; episode: Episode }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_RATE'; rate: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_ACTIVE_CUE'; index: number }
  | { type: 'CLEAR' }
