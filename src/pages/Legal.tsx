import { Link } from 'react-router-dom'

const sections = {
  privacy: {
    eyebrow: '隐私说明',
    title: '我们如何处理你的学习数据',
    intro: 'ShadowCast 只收集提供账号、收藏、播放进度和字幕书签功能所需的数据。',
    items: [
      ['保存的内容', '登录后，我们会保存账号资料、收藏的播客、剧集播放进度和字幕书签。'],
      ['第三方服务', '播客目录与封面来自 PodcastIndex 及播客发布方；GitHub 登录会使用 GitHub 提供的身份信息。'],
      ['公开信息', '我们不会公开你的个人资料、收藏、播放进度或字幕书签。'],
      ['账号控制', '你可以在账号设置中管理登录方式。需要删除账号数据时，请通过项目仓库联系我们。'],
    ],
  },
  terms: {
    eyebrow: '使用条款',
    title: '使用 ShadowCast 前需要知道的事项',
    intro: 'ShadowCast 是用于播客跟读练习的开源工具，不提供播客内容本身。',
    items: [
      ['内容来源', '播客、音频、封面和字幕的权利属于各自发布方。请遵守内容来源的使用规则。'],
      ['服务可用性', '第三方目录、音频和字幕可能变更或暂时不可用，我们无法保证所有内容始终可访问。'],
      ['合理使用', '请勿利用本服务进行侵权、滥用接口或影响其他用户正常使用的活动。'],
      ['条款更新', '功能或数据处理方式发生变化时，我们会同步更新本页面。'],
    ],
  },
} as const

export function Privacy() {
  return <LegalPage content={sections.privacy} />
}

export function Terms() {
  return <LegalPage content={sections.terms} />
}

function LegalPage({ content }: { content: (typeof sections)[keyof typeof sections] }) {
  return (
    <article className="mx-auto max-w-3xl pb-20">
      <Link to="/" className="text-sm font-semibold text-amber-100 transition hover:text-white">返回首页</Link>
      <header className="mt-6 border-b border-white/10 pb-8">
        <p className="studio-eyebrow">{content.eyebrow}</p>
        <h1 className="studio-title mt-3 text-4xl leading-tight sm:text-6xl">{content.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">{content.intro}</p>
      </header>
      <div className="divide-y divide-white/10">
        {content.items.map(([title, text]) => (
          <section key={title} className="py-7">
            <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
