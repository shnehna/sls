import { Link } from 'react-router-dom'
import ContinueListening from '../components/ContinueListening'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { formatTime, timeAgo } from '../utils/format'

export default function Library() {
  const { user, loading: authLoading } = useAuth()
  const { library, loading, error } = useLibrary()

  if (authLoading) return <section className="studio-panel p-8 text-slate-300">Loading library…</section>

  if (!user) {
    return (
      <section className="studio-panel p-8 text-center">
        <p className="studio-eyebrow">My Learning Studio</p>
        <h1 className="studio-title mt-3 text-4xl">Log in to open your library</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300">Save podcasts, continue shadowing sessions, and collect transcript lines after login.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/auth/login" className="studio-button-primary">Log in</Link>
          <Link to="/auth/register" className="studio-button-ghost">Create account</Link>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-8 pb-28">
      <section className="studio-panel p-7 sm:p-9">
        <p className="studio-eyebrow">My Learning Studio</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="studio-title text-5xl leading-none">Welcome back, {user.displayName}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Continue your English shadowing practice from saved podcasts, progress, and transcript bookmarks.</p>
          </div>
          <Link to="/search?q=english learning" className="studio-button-primary">Find practice feeds</Link>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          <Stat label="Saved podcasts" value={library?.stats.savedPodcastCount || 0} />
          <Stat label="In progress" value={library?.stats.inProgressEpisodeCount || 0} />
          <Stat label="Bookmarks" value={library?.stats.bookmarkCount || 0} />
          <Stat label="Last practice" value={library?.stats.lastPracticeAt ? timeAgo(Math.floor(new Date(library.stats.lastPracticeAt).getTime() / 1000)) : '—'} />
        </div>
      </section>

      {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-rose-100">{error}</div>}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="studio-eyebrow">Continue listening</p>
            <h2 className="studio-title mt-1 text-3xl">Resume your latest sessions</h2>
          </div>
          <Link to="/library/progress" className="hidden text-sm font-semibold text-aurora-200 hover:text-ember-200 sm:block">View progress →</Link>
        </div>
        <ContinueListening items={library?.recentProgress || []} loading={loading} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">Saved podcasts</p>
              <h2 className="studio-title mt-1 text-3xl">Your personal shelf</h2>
            </div>
            <Link to="/library/saved" className="text-sm font-semibold text-aurora-200 hover:text-ember-200">View all →</Link>
          </div>
          <div className="space-y-3">
            {(library?.savedPodcasts || []).length === 0 && <Empty text="Save podcasts from search or podcast pages to see them here." />}
            {(library?.savedPodcasts || []).map((podcast) => (
              <Link key={podcast.id} to={`/podcast/${podcast.podcastId}`} className="studio-card flex items-center gap-3 p-4">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] text-ember-300">
                  {podcast.image ? <img src={podcast.image} alt="" className="h-full w-full object-cover" /> : '♪'}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-50">{podcast.title || `Podcast ${podcast.podcastId}`}</h3>
                  {podcast.author && <p className="truncate text-sm text-slate-400">{podcast.author}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="studio-eyebrow">Recent bookmarks</p>
              <h2 className="studio-title mt-1 text-3xl">Practice saved lines</h2>
            </div>
            <Link to="/library/bookmarks" className="text-sm font-semibold text-aurora-200 hover:text-ember-200">View all →</Link>
          </div>
          <div className="space-y-3">
            {(library?.recentBookmarks || []).length === 0 && <Empty text="Bookmark transcript lines during practice to collect them here." />}
            {(library?.recentBookmarks || []).map((bookmark) => (
              <Link key={bookmark.id} to={`/episode/${bookmark.episodeId}?t=${Math.floor(bookmark.cueStartTime || 0)}`} className="studio-card block p-4">
                <p className="line-clamp-2 text-sm leading-6 text-slate-200">“{bookmark.cueText || bookmark.note || 'Saved line'}”</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[.08em] text-slate-500">{bookmark.episodeTitle || `Episode ${bookmark.episodeId}`} · {formatTime(bookmark.cueStartTime || 0)}</p>
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
