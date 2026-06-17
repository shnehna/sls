import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MusicNote } from '@phosphor-icons/react'
import { getEpisodeProgressList, getTranscriptBookmarks, type EpisodeProgressItem, type TranscriptBookmarkItem } from '../api/library'
import ProgressCard from '../components/ProgressCard'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

export default function SavedPodcasts() {
  const { user, loading: authLoading } = useAuth()
  const { savedPodcasts, removeSavedPodcast, loading } = useLibrary()

  if (authLoading || loading) return <section className="studio-panel p-8 text-slate-300">正在加载收藏播客...</section>
  if (!user) return <LoginGate title="登录后查看收藏播客" />

  return (
    <div className="space-y-6 pb-28">
      <header className="studio-panel p-7 sm:p-9">
        <p className="studio-eyebrow">收藏播客</p>
        <h1 className="studio-title mt-2 text-5xl">你的个人书架</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">这里是你为集中跟读练习保存的播客。</p>
      </header>
      {savedPodcasts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.05] p-6 text-slate-300">还没有收藏播客。<Link to="/search?q=conversation" className="text-amber-100 hover:text-white">去找一个收藏。</Link></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {savedPodcasts.map((podcast) => (
            <div key={podcast.id} className="studio-card flex gap-4 p-4">
              <Link to={`/podcast/${podcast.podcastId}`} className="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] text-2xl text-ember-300">
                {podcast.image ? <img src={podcast.image} alt="" className="h-full w-full object-cover" /> : <MusicNote weight="fill" aria-hidden="true" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/podcast/${podcast.podcastId}`} className="font-semibold text-slate-50 hover:text-ember-100">{podcast.title || `播客 ${podcast.podcastId}`}</Link>
                {podcast.author && <p className="mt-1 truncate text-sm text-slate-400">{podcast.author}</p>}
                <button type="button" onClick={() => void removeSavedPodcast(podcast.podcastId)} className="mt-4 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-danger/40 hover:text-rose-200">移除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Bookmarks() {
  const { user, loading: authLoading } = useAuth()
  const [bookmarks, setBookmarks] = useState<TranscriptBookmarkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getTranscriptBookmarks()
      .then((result) => {
        setBookmarks(result.bookmarks)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载书签失败'))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || loading) return <section className="studio-panel p-8 text-slate-300">正在加载书签...</section>
  if (!user) return <LoginGate title="登录后查看书签" />

  return (
    <div className="space-y-6 pb-28">
      <header className="studio-panel p-7 sm:p-9">
        <p className="studio-eyebrow">字幕书签</p>
        <h1 className="studio-title mt-2 text-5xl">保存过的跟读句子</h1>
      </header>
      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}
      <div className="space-y-3">
        {bookmarks.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[.05] p-6 text-slate-300">还没有书签。</div>}
        {bookmarks.map((bookmark) => (
          <Link key={bookmark.id} to={`/episode/${bookmark.episodeId}?t=${Math.floor(bookmark.cueStartTime || 0)}`} className="studio-card block p-5">
            <p className="text-base leading-8 text-slate-100">“{bookmark.cueText || bookmark.note || '已保存句子'}”</p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[.08em] text-slate-500">{bookmark.episodeTitle || `剧集 ${bookmark.episodeId}`}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Progress() {
  const { user, loading: authLoading } = useAuth()
  const [progress, setProgress] = useState<EpisodeProgressItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getEpisodeProgressList()
      .then((result) => {
        setProgress(result.progress)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载进度失败'))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || loading) return <section className="studio-panel p-8 text-slate-300">正在加载进度...</section>
  if (!user) return <LoginGate title="登录后查看练习进度" />

  return (
    <div className="space-y-6 pb-28">
      <header className="studio-panel p-7 sm:p-9">
        <p className="studio-eyebrow">练习进度</p>
        <h1 className="studio-title mt-2 text-5xl">继续收听</h1>
      </header>
      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {progress.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[.05] p-6 text-slate-300">还没有练习进度。</div>}
        {progress.map((item) => <ProgressCard key={item.id} progress={item} />)}
      </div>
    </div>
  )
}

function LoginGate({ title }: { title: string }) {
  return (
    <section className="studio-panel p-8 text-center">
      <p className="studio-eyebrow">我的学习工作台</p>
      <h1 className="studio-title mt-3 text-4xl">{title}</h1>
      <Link to="/auth/login" className="studio-button-primary mt-7">登录</Link>
    </section>
  )
}
