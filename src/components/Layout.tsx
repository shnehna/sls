import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect, type FormEvent } from 'react'
import { GithubLogo, List, MagnifyingGlass, X } from '@phosphor-icons/react'
import AudioPlayer from './AudioPlayer'
import { useAuth } from '../context/AuthContext'

const githubRepoUrl = 'https://github.com/shnehna/sls'

export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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
    setMobileNavOpen(false)
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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-3 py-2 font-medium transition ${
      isActive
        ? 'bg-ember-300/14 text-amber-100 ring-1 ring-ember-300/25'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="studio-shell">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-ember-300 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950 focus:shadow-ember">
        跳到主要内容
      </a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/76 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3 text-slate-50">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-glow">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,197,109,.7),transparent_34%),radial-gradient(circle_at_78%_80%,rgba(56,189,248,.6),transparent_38%)] opacity-90 transition duration-300 group-hover:scale-110" />
              <span className="relative font-display text-lg font-extrabold tracking-[-.08em] text-white">SC</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold leading-none tracking-[-.04em]">ShadowCast</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[.18em] text-slate-400 sm:block">播客跟读工作台</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            <NavLink to="/" end className={navLinkClass}>
              首页
            </NavLink>
              <NavLink to="/library" className={navLinkClass}>
                我的资料库
              </NavLink>
              <NavLink to="/search?q=conversation" className={navLinkClass}>
                练习播客
              </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在 GitHub 上为 ShadowCast 点 Star"
              className="hidden h-10 items-center justify-center gap-2 rounded-xl border border-ember-300/35 bg-ember-300/10 px-3 text-sm font-semibold text-amber-100 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ember-300/65 hover:bg-ember-300/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-ember-300 focus:ring-offset-2 focus:ring-offset-ink-950 sm:inline-flex"
            >
              <GithubLogo className="h-4 w-4" weight="fill" aria-hidden="true" />
              <span className="hidden sm:inline">GitHub Star</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setSearchOpen((open) => !open)
                setMobileNavOpen(false)
              }}
              className="studio-button-ghost !px-3 !py-2"
              aria-label="搜索"
              aria-expanded={searchOpen}
            >
              <MagnifyingGlass className="h-4 w-4" weight="bold" aria-hidden="true" />
              <span className="ml-2 hidden sm:inline">搜索</span>
            </button>

            {!loading && !user && (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/auth/login" className="studio-button-ghost !px-3 !py-2">登录</Link>
                <Link to="/auth/register" className="studio-button-primary !px-3 !py-2">注册</Link>
              </div>
            )}

            {!loading && user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.06] px-2.5 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                  aria-expanded={accountOpen}
                  aria-label={`打开 ${user.displayName} 的账号菜单`}
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
                    <Link to="/account" className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">账号设置</Link>
                    <Link to="/library" className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">我的资料库</Link>
                    <Link to="/library/progress" className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">继续练习</Link>
                    <button type="button" onClick={() => void handleLogout()} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 hover:text-white">退出登录</button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileNavOpen((open) => !open)
                setSearchOpen(false)
              }}
              className="studio-button-ghost !px-3 !py-2 md:hidden"
              aria-label={mobileNavOpen ? '关闭导航菜单' : '打开导航菜单'}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
            >
              {mobileNavOpen ? <X className="h-4 w-4" weight="bold" aria-hidden="true" /> : <List className="h-4 w-4" weight="bold" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav id="mobile-navigation" aria-label="移动端导航" className="mx-auto grid max-w-7xl gap-2 border-t border-white/10 px-4 py-3 md:hidden">
            <NavLink to="/" end className={navLinkClass}>首页</NavLink>
            <NavLink to="/search?q=conversation" className={navLinkClass}>练习播客</NavLink>
            <NavLink to="/library" className={navLinkClass}>我的资料库</NavLink>
            <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
              GitHub 项目
            </a>
            {!loading && !user && (
              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link to="/auth/login" className="studio-button-ghost justify-center !px-3 !py-2">登录</Link>
                <Link to="/auth/register" className="studio-button-primary justify-center !px-3 !py-2">注册</Link>
              </div>
            )}
          </nav>
        )}

        {searchOpen && (
          <div className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
            <form onSubmit={handleSearch} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[.06] p-2 shadow-panel backdrop-blur-xl">
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索播客、主题、口音..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-ember-300 focus:ring-2 focus:ring-ember-300/20"
              />
              <button className="studio-button-primary !px-4 !py-2">前往</button>
            </form>
          </div>
        )}
      </header>

      <main id="main-content" className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 ${isEpisodeRoute ? 'max-w-7xl lg:py-8' : 'max-w-6xl'}`}>
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-ink-950/50 px-4 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p>数据来自 <a href="https://podcastindex.org" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-100 hover:text-white">PodcastIndex.org</a></p>
          <nav aria-label="页脚导航" className="flex items-center gap-4">
            <Link to="/privacy" className="transition hover:text-slate-200">隐私说明</Link>
            <Link to="/terms" className="transition hover:text-slate-200">使用条款</Link>
            <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-200">开源代码</a>
          </nav>
        </div>
      </footer>

      {showMiniPlayer && <AudioPlayer />}
    </div>
  )
}
