import type { PodcastFeed } from '../api/types'
import { isEnglishPodcast, podcastSearchText } from '../utils/podcast'

export interface LearningCategory {
  id: string
  label: string
  title: string
  description: string
  query: string
  trendingCategories: string
  excludedCategories?: string
  searchTerms: string[]
  focus: string
}

export const learningCategories: LearningCategory[] = [
  {
    id: 'daily-expression',
    label: 'Daily expression',
    title: 'Everyday conversation',
    description: 'Natural phrases, small talk, and familiar situations for daily speaking practice.',
    query: 'daily conversation',
    trendingCategories: 'Education,Language,Learning',
    searchTerms: ['daily', 'conversation', 'speaking', 'small talk', 'everyday', 'real english'],
    focus: 'short turns and natural rhythm',
  },
  {
    id: 'workplace',
    label: 'Workplace',
    title: 'Business and career English',
    description: 'Meetings, interviews, presentations, and professional communication.',
    query: 'business communication',
    trendingCategories: 'Business,Careers,Education',
    searchTerms: ['business', 'workplace', 'career', 'interview', 'meeting', 'communication'],
    focus: 'clear opinions and work scenarios',
  },
  {
    id: 'clear-news',
    label: 'Clear news',
    title: 'News without the rush',
    description: 'Explainers and slower news formats that are useful for listening drills.',
    query: 'slow news',
    trendingCategories: 'News,Daily,Education',
    excludedCategories: 'Politics',
    searchTerms: ['slow news', 'news', 'explained', 'current events', 'world news'],
    focus: 'structured topics and clear delivery',
  },
  {
    id: 'stories',
    label: 'Stories',
    title: 'Stories and narrative',
    description: 'Narrative shows with expressive pacing, emotion, and memorable lines.',
    query: 'stories',
    trendingCategories: 'Fiction,Stories,History',
    searchTerms: ['story', 'stories', 'storytelling', 'history', 'narrative', 'true story'],
    focus: 'intonation and connected speech',
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    title: 'Science, tech, and ideas',
    description: 'Topic-rich listening for learners who want stronger long-form comprehension.',
    query: 'science technology',
    trendingCategories: 'Science,Technology,Education',
    searchTerms: ['science', 'technology', 'startup', 'ai', 'psychology', 'ideas'],
    focus: 'longer sentences and explanation',
  },
  {
    id: 'pronunciation',
    label: 'Pronunciation',
    title: 'Pronunciation and listening',
    description: 'Shows made for English learners, pronunciation work, and listening practice.',
    query: 'pronunciation',
    trendingCategories: 'Education,Language,Learning',
    searchTerms: ['pronunciation', 'listening', 'learn english', 'esl', 'vocabulary', 'grammar'],
    focus: 'accuracy and repeatable drills',
  },
  {
    id: 'light-listening',
    label: 'Light listening',
    title: 'Easy companion listening',
    description: 'Culture, travel, food, and calm topics for low-pressure practice.',
    query: 'culture travel',
    trendingCategories: 'Society,Culture,Travel',
    searchTerms: ['culture', 'travel', 'food', 'wellbeing', 'mindfulness', 'lifestyle'],
    focus: 'relaxed pace and broad vocabulary',
  },
]

const generalLearningTerms = [
  'english',
  'learn english',
  'esl',
  'conversation',
  'speaking',
  'listening',
  'pronunciation',
  'vocabulary',
  'grammar',
  'practice',
]

const weakFitTerms = ['crypto', 'politics', 'breaking news', 'comedy', 'sports betting']

function includesAny(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0)
}

export function practiceScore(podcast: PodcastFeed, category: LearningCategory): number {
  const text = podcastSearchText(podcast)
  const language = podcast.language?.toLowerCase() || ''
  let score = 0

  if (language.startsWith('en')) score += 30
  if (!language && text.includes('english')) score += 12

  score += includesAny(text, category.searchTerms) * 14
  score += includesAny(text, generalLearningTerms) * 8
  score -= includesAny(text, weakFitTerms) * 12

  if (podcast.description && podcast.description.length > 80) score += 8
  if (podcast.image || podcast.artwork) score += 4
  if (podcast.episodeCount && podcast.episodeCount >= 10) score += 6
  if (podcast.episodeCount && podcast.episodeCount > 300) score -= 4
  if (podcast.trendScore) score += Math.min(12, Math.max(0, podcast.trendScore / 10))
  if (podcast.explicit) score -= 10
  if (podcast.dead) score -= 20

  return score
}

export function rankPodcastsForCategory(podcasts: PodcastFeed[], category: LearningCategory): PodcastFeed[] {
  const seen = new Set<number>()
  return podcasts
    .filter((podcast) => {
      if (seen.has(podcast.id)) return false
      seen.add(podcast.id)
      return true
    })
    .filter(isEnglishPodcast)
    .map((podcast) => ({ podcast, score: practiceScore(podcast, category) }))
    .filter(({ podcast, score }) => !podcast.dead && score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ podcast }) => podcast)
}
