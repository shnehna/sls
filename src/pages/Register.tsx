import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { startGithubLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      const state = await register({ username, displayName, password })
      navigate(state.isFirstUse ? '/onboarding' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.9fr_1fr]">
      <form onSubmit={handleSubmit} className="studio-card space-y-5 p-6 sm:p-7">
        <div>
          <p className="studio-eyebrow">新账号</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">创建你的练习档案</h1>
        </div>
        <label className="block text-sm font-medium text-slate-200">
          用户名
          <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="username" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="字母、数字、_ 或 -" required />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          昵称
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="希望我们怎么称呼你？" />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          密码
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="至少 8 位，包含字母和数字" required />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          确认密码
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="再次输入密码" required />
        </label>
        <p className="text-xs leading-5 text-slate-500">用户名长度 3-24 位。密码需要至少包含一个字母和一个数字。</p>
        {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting} className="studio-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? '创建中...' : '创建账号'}</button>
        <p className="text-center text-sm text-slate-400">已经注册？ <Link to="/auth/login" className="text-aurora-300 hover:text-ember-300">去登录</Link></p>
      </form>

      <div className="studio-panel p-7 sm:p-10">
        <p className="studio-eyebrow">随时继续练习</p>
        <h2 className="studio-title mt-3 text-5xl leading-none sm:text-6xl">保存真正能改善发音的练习</h2>
        <p className="mt-5 text-slate-300">账号会保存播客、剧集进度和后续书签，不需要邮箱订阅。</p>
        <button type="button" onClick={() => void startGithubLogin()} className="studio-button-ghost mt-8">使用 GitHub 注册</button>
      </div>
    </section>
  )
}
