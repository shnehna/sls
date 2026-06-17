import { Link } from 'react-router-dom'
import { MusicNote } from '@phosphor-icons/react'
import ContinueListening from '../components/ContinueListening'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { formatTime, timeAgo } from '../utils/format'

export default function Library() {
  const { user, loading: authLoading } = useAuth()
  const { library, loading, error } = useLibrary()

  if (authLoading) return <section className="studio-panel p-8 text-slate-300">正在加载资料库...</section>

  if (!user) {
    return (
      <section className="studio-panel p-8 text-center">
        <p className="studio-eyebrow">我的学习工作台</p>
        <h1 className="studio-title mt-3 text-4xl">登录后打开你的资料库</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300">登录后可以收藏播客、继续跟读进度，并保存值得反复练习的字幕句子。</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/auth/login" className="studio-button-primary">登录</Link>
          <Link to="/auth/register" className="studio-button-ghost">创建账号</Link>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-8 pb-28">
      <section className="studio-panel p-7 sm:p-9">
        <p className="studio-eyebrow">我的学习工作台</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="studio-title text-5xl leading-none">欢迎回来，{user.displayName}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">从收藏播客、学习进度和字幕书签继续你的英语跟读练习。</p>
          </div>
          <Link to="/search?q=conversation" className="studio-button-primary">寻找练习播客</Link>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          <Stat label="收藏播客" value={library?.stats.savedPodcastCount || 0} />
          <Stat label="练习中" value={library?.stats.inProgressEpisodeCount || 0} />
          <Stat label="书签" value={library?.stats.bookmarkCount || 0} />
          <Stat label="上次练习" value={library?.stats.lastPracticeAt ? timeAgo(Math.floor(new Date(library.stats.lastPracticeAt).getTime() / 1000)) : '—'} />
        </div>
      </section>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="studio-eyebrow">继续收听</p>
            <h2 className="studio-title mt-1 text-3xl">接着上次的练习</h2>
          </div>
          <Link to="/library/progress" className="hidden text-sm font-semibold text-amber-100 hover:text-white sm:block">查看进度</Link>
        </div>
        <ContinueListening items={library?.recentProgress || []} loading={loading} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">收藏播客</p>
              <h2 className="studio-title mt-1 text-3xl">你的个人书架</h2>
            </div>
            <Link to="/library/saved" className="text-sm font-semibold text-amber-100 hover:text-white">查看全部</Link>
          </div>
          <div className="space-y-3">
            {(library?.savedPodcasts || []).length === 0 && <Empty text="从搜索页或播客详情页收藏播客后，会显示在这里。" />}
            {(library?.savedPodcasts || []).map((podcast) => (
              <Link key={podcast.id} to={`/podcast/${podcast.podcastId}`} className="studio-card flex items-center gap-3 p-4">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] text-ember-300">
                  {podcast.image ? <img src={podcast.image} alt="" className="h-full w-full object-cover" /> : <MusicNote weight="fill" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-50">{podcast.title || `播客 ${podcast.podcastId}`}</h3>
                  {podcast.author && <p className="truncate text-sm text-slate-400">{podcast.author}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">最近书签</p>
              <h2 className="studio-title mt-1 text-3xl">练习保存过的句子</h2>
            </div>
            <Link to="/library/bookmarks" className="text-sm font-semibold text-amber-100 hover:text-white">查看全部</Link>
          </div>
          <div className="space-y-3">
            {(library?.recentBookmarks || []).length === 0 && <Empty text="练习时收藏字幕句子后，会集中显示在这里。" />}
            {(library?.recentBookmarks || []).map((bookmark) => (
              <Link key={bookmark.id} to={`/episode/${bookmark.episodeId}?t=${Math.floor(bookmark.cueStartTime || 0)}`} className="studio-card block p-4">
                <p className="line-clamp-2 text-sm leading-6 text-slate-200">“{bookmark.cueText || bookmark.note || '已保存句子'}”</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[.08em] text-slate-500">{bookmark.episodeTitle || `剧集 ${bookmark.episodeId}`} · {formatTime(bookmark.cueStartTime || 0)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.05] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5 text-sm leading-6 text-slate-400">{text}</div>
}
