import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { startGithubLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const state = await login({ username, password, remember })
      navigate(state.isFirstUse ? '/onboarding' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_.9fr]">
      <div className="studio-panel p-7 sm:p-10">
        <p className="studio-eyebrow">欢迎回来</p>
        <h1 className="studio-title mt-3 text-5xl leading-none sm:text-6xl">继续你的跟读练习</h1>
        <p className="mt-5 max-w-xl text-slate-300">登录后可以同步收藏的播客、剧集进度和逐句跟读记录。</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => void startGithubLogin()} className="studio-button-ghost">使用 GitHub 登录</button>
          <Link to="/auth/register" className="studio-button-primary">创建账号</Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="studio-card space-y-5 p-6 sm:p-7">
        <div>
          <p className="studio-eyebrow">密码登录</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">登录</h2>
        </div>
        <label className="block text-sm font-medium text-slate-200">
          用户名
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-ember-300 focus:ring-2 focus:ring-ember-300/20" placeholder="yourname" required />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          密码
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-ember-300 focus:ring-2 focus:ring-ember-300/20" placeholder="••••••••" required />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-950" />
          在这台设备上保持登录
        </label>
        {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting} className="studio-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? '登录中...' : '登录'}</button>
        <p className="text-center text-sm text-slate-400">还没有账号？ <Link to="/auth/register" className="text-amber-100 hover:text-white">去注册</Link></p>
      </form>
    </section>
  )
}
