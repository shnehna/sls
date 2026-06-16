import type { PodcastCategory } from '../api/types'

export interface LifeTopic {
  name: string
  label: string
  description: string
}

export const lifeTopicCatalog: LifeTopic[] = [
  { name: 'Food', label: 'Food', description: 'Cooking, restaurants, and everyday taste.' },
  { name: 'Travel', label: 'Travel', description: 'Places, trips, and cross-cultural stories.' },
  { name: 'Relationships', label: 'Relationships', description: 'People, communication, and social life.' },
  { name: 'Health', label: 'Health', description: 'Wellbeing, habits, and practical care.' },
  { name: 'Fitness', label: 'Fitness', description: 'Movement, routines, and active living.' },
  { name: 'Technology', label: 'Technology', description: 'Products, trends, and digital work.' },
  { name: 'Science', label: 'Science', description: 'Ideas, discoveries, and clear explanations.' },
  { name: 'Stories', label: 'Stories', description: 'Narratives with expressive voices.' },
  { name: 'History', label: 'History', description: 'People, events, and context-rich listening.' },
  { name: 'Books', label: 'Books', description: 'Reading, authors, and literary conversation.' },
  { name: 'Music', label: 'Music', description: 'Artists, scenes, and cultural references.' },
  { name: 'Film', label: 'Film', description: 'Movies, reviews, and visual culture.' },
]

export function lifeTopicsFromCategories(categories: PodcastCategory[]): LifeTopic[] {
  const available = new Set(categories.map((category) => category.name))
  const matched = lifeTopicCatalog.filter((topic) => available.has(topic.name))
  return matched.length > 0 ? matched : lifeTopicCatalog
}
