import type { PodcastCategory } from '../api/types'

export interface LifeTopic {
  name: string
  label: string
  description: string
}

export const lifeTopicCatalog: LifeTopic[] = [
  { name: 'Food', label: '美食', description: '烹饪、餐厅和日常口味。' },
  { name: 'Travel', label: '旅行', description: '地点、旅途和跨文化故事。' },
  { name: 'Relationships', label: '关系', description: '人际、沟通和社交生活。' },
  { name: 'Health', label: '健康', description: '身心健康、习惯和实用护理。' },
  { name: 'Fitness', label: '健身', description: '运动、训练计划和积极生活。' },
  { name: 'Technology', label: '科技', description: '产品、趋势和数字工作方式。' },
  { name: 'Science', label: '科学', description: '观点、发现和清晰解释。' },
  { name: 'Stories', label: '故事', description: '有表现力的叙事内容。' },
  { name: 'History', label: '历史', description: '人物、事件和有上下文的听力。' },
  { name: 'Books', label: '书籍', description: '阅读、作者和文学对谈。' },
  { name: 'Music', label: '音乐', description: '艺术家、场景和文化背景。' },
  { name: 'Film', label: '电影', description: '电影、评论和视觉文化。' },
]

export function lifeTopicsFromCategories(categories: PodcastCategory[]): LifeTopic[] {
  const available = new Set(categories.map((category) => category.name))
  const matched = lifeTopicCatalog.filter((topic) => available.has(topic.name))
  return matched.length > 0 ? matched : lifeTopicCatalog
}
