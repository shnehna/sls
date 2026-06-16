import type { PodcastFeed } from '../api/types'

export function podcastSearchText(podcast: PodcastFeed): string {
  const categories = podcast.categories ? Object.values(podcast.categories).join(' ') : ''
  return [
    podcast.title,
    podcast.author,
    podcast.description,
    podcast.language,
    categories,
  ].filter(Boolean).join(' ').toLowerCase()
}

export function isEnglishPodcast(podcast: PodcastFeed): boolean {
  const language = podcast.language?.toLowerCase()
  if (language) return language.startsWith('en')

  return /\benglish\b/.test(podcastSearchText(podcast))
}

export function filterEnglishPodcasts(podcasts: PodcastFeed[]): PodcastFeed[] {
  return podcasts.filter(isEnglishPodcast)
}
