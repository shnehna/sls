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
    label: '日常表达',
    title: '日常对话',
    description: '适合练习自然短句、寒暄和熟悉生活场景的表达。',
    query: 'daily conversation',
    trendingCategories: 'Education,Language,Learning',
    searchTerms: ['daily', 'conversation', 'speaking', 'small talk', 'everyday', 'real english'],
    focus: '短句轮换和自然语调',
  },
  {
    id: 'workplace',
    label: '职场沟通',
    title: '商务和职业英语',
    description: '覆盖会议、面试、演讲和专业沟通场景。',
    query: 'business communication',
    trendingCategories: 'Business,Careers,Education',
    searchTerms: ['business', 'workplace', 'career', 'interview', 'meeting', 'communication'],
    focus: '清晰表达观点和职场场景',
  },
  {
    id: 'clear-news',
    label: '清晰新闻',
    title: '不赶节奏的新闻',
    description: '偏解释型、语速更友好的新闻内容，适合听力训练。',
    query: 'slow news',
    trendingCategories: 'News,Daily,Education',
    excludedCategories: 'Politics',
    searchTerms: ['slow news', 'news', 'explained', 'current events', 'world news'],
    focus: '结构化话题和清晰表达',
  },
  {
    id: 'stories',
    label: '故事叙事',
    title: '故事和叙事节目',
    description: '有节奏、情绪和记忆点的叙事节目，适合影子跟读。',
    query: 'stories',
    trendingCategories: 'Fiction,Stories,History',
    searchTerms: ['story', 'stories', 'storytelling', 'history', 'narrative', 'true story'],
    focus: '语调和连读',
  },
  {
    id: 'knowledge',
    label: '知识拓展',
    title: '科学、科技和观点',
    description: '适合想提升长内容理解能力的主题型听力材料。',
    query: 'science technology',
    trendingCategories: 'Science,Technology,Education',
    searchTerms: ['science', 'technology', 'startup', 'ai', 'psychology', 'ideas'],
    focus: '长句理解和解释性表达',
  },
  {
    id: 'pronunciation',
    label: '发音听力',
    title: '发音和听力训练',
    description: '面向英语学习者的发音、听辨和基础练习内容。',
    query: 'pronunciation',
    trendingCategories: 'Education,Language,Learning',
    searchTerms: ['pronunciation', 'listening', 'learn english', 'esl', 'vocabulary', 'grammar'],
    focus: '准确度和可重复训练',
  },
  {
    id: 'light-listening',
    label: '轻松泛听',
    title: '低压力陪伴式听力',
    description: '文化、旅行、美食和轻松话题，适合低压力练习。',
    query: 'culture travel',
    trendingCategories: 'Society,Culture,Travel',
    searchTerms: ['culture', 'travel', 'food', 'wellbeing', 'mindfulness', 'lifestyle'],
    focus: '放松节奏和日常词汇',
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
