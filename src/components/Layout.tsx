import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect, type FormEvent } from 'react'
import AudioPlayer from './AudioPlayer'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, logout } = useAuth()
  const isEpisodeRoute = location.pathname.startsWith('/episode/')
  const showMiniPlayer = !isEpisodeRoute
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    setAccountOpen(false)
  }, [location.pathname])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
      setSearchOpen(false)
      setSearchInput('')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="studio-shell">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/76 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3 text-slate-50">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-glow">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,197,109,.7),transparent_34%),radial-gradient(circle_at_78%_80%,rgba(56,189,248,.6),transparent_38%)] opacity-90 transition duration-300 group-hover:scale-110" />
              <span className="relative font-display text-lg font-extrabold tracking-[-.08em] text-white">SC</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold leading-none tracking-[-.04em]">ShadowCast</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[.18em] text-slate-400 sm:block">Podcast shadow studio</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link to="/" className="rounded-xl px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
              Home
            </Link>
              <Link to="/library" className="rounded-xl px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                My Library
              </Link>
              <Link to="/search?q=english learning" className="rounded-xl px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                Practice feeds
              </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="studio-button-ghost !px-3 !py-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="ml-2 hidden sm:inline">Search</span>
            </button>

            {!loading && !user && (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/auth/login" className="studio-button-ghost !px-3 !py-2">Log in</Link>
                <Link to="/auth/register" className="studio-button-primary !px-3 !py-2">Sign up</Link>
              </div>
            )}

            {!loading && user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.06] px-2.5 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                  aria-expanded={accountOpen}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-ember-300/20 font-bold text-amber-100">{user.displayName.slice(0, 1).toUpperCase()}</span>
                  )}
                  <span className="hidden max-w-28 truncate sm:inline">{user.displayName}</span>
                </button>

                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-ink-900/95 p-2 shadow-panel backdrop-blur-xl">
                    <Link to="/account" className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">Account</Link>
                    <Link to="/library" className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">My Library</Link>
                    <Link to="/library/progress" className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">Continue Practice</Link>
                    <button type="button" onClick={() => void handleLogout()} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 hover:text-white">Logout</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!loading && !user && (
          <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 sm:hidden">
            <Link to="/auth/login" className="studio-button-ghost flex-1 justify-center !px-3 !py-2">Log in</Link>
            <Link to="/auth/register" className="studio-button-primary flex-1 justify-center !px-3 !py-2">Sign up</Link>
          </div>
        )}

        {searchOpen && (
          <div className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
            <form onSubmit={handleSearch} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[.06] p-2 shadow-panel backdrop-blur-xl">
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search podcasts, topics, accents…"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300 focus:ring-2 focus:ring-aurora-300/20"
              />
              <button className="studio-button-primary !px-4 !py-2">Go</button>
            </form>
          </div>
        )}
      </header>

      <main className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 ${isEpisodeRoute ? 'max-w-7xl lg:py-8' : 'max-w-6xl'}`}>
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-ink-950/50 py-5 text-center text-xs text-slate-500">
        Powered by <a href="https://podcastindex.org" target="_blank" rel="noopener noreferrer" className="font-medium text-aurora-300 hover:text-ember-300">PodcastIndex.org</a>
      </footer>

      {showMiniPlayer && <AudioPlayer />}
    </div>
  )
}
