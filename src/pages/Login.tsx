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
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_.9fr]">
      <div className="studio-panel p-7 sm:p-10">
        <p className="studio-eyebrow">Welcome back</p>
        <h1 className="studio-title mt-3 text-5xl leading-none sm:text-6xl">Continue your shadowing streak</h1>
        <p className="mt-5 max-w-xl text-slate-300">Sign in to keep saved podcasts, episode progress, and transcript practice ready across devices.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => void startGithubLogin()} className="studio-button-ghost">Continue with GitHub</button>
          <Link to="/auth/register" className="studio-button-primary">Create account</Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="studio-card space-y-5 p-6 sm:p-7">
        <div>
          <p className="studio-eyebrow">Password login</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Log in</h2>
        </div>
        <label className="block text-sm font-medium text-slate-200">
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="yourname" required />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="••••••••" required />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-950" />
          Keep me signed in on this device
        </label>
        {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting} className="studio-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-slate-400">No account yet? <Link to="/auth/register" className="text-aurora-300 hover:text-ember-300">Sign up</Link></p>
      </form>
    </section>
  )
}
