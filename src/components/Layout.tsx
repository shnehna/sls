import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect, type FormEvent } from 'react'
import AudioPlayer from './AudioPlayer'

export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const showMiniPlayer = !location.pathname.startsWith('/episode/')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
      setSearchOpen(false)
      setSearchInput('')
    }
  }

  return (
    <div className="studio-shell">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3 text-slate-950">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              SC
            </span>
            <span>
              <span className="block text-base font-semibold leading-none">ShadowCast</span>
              <span className="hidden text-xs text-slate-500 sm:block">Podcast shadow reading</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link to="/" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              Home
            </Link>
            <Link to="/search?q=english learning" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              Practice feeds
            </Link>
          </nav>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="studio-button-ghost !px-3 !py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="ml-2 hidden sm:inline">Search</span>
          </button>
        </div>

        {searchOpen && (
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <form onSubmit={handleSearch} className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search podcasts, topics, accents…"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button className="studio-button-primary !px-4 !py-2">Go</button>
            </form>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        Powered by <a href="https://podcastindex.org" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-700">PodcastIndex.org</a>
      </footer>

      {showMiniPlayer && <AudioPlayer />}
    </div>
  )
}
