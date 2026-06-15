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
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const state = await register({ username, displayName, password })
      navigate(state.isFirstUse ? '/onboarding' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.9fr_1fr]">
      <form onSubmit={handleSubmit} className="studio-card space-y-5 p-6 sm:p-7">
        <div>
          <p className="studio-eyebrow">New account</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">Create your studio profile</h1>
        </div>
        <label className="block text-sm font-medium text-slate-200">
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} autoComplete="username" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="letters, numbers, _ or -" required />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="How should we greet you?" />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="8+ chars with letters and numbers" required />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Confirm password
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 focus:border-aurora-300" placeholder="Repeat password" required />
        </label>
        <p className="text-xs leading-5 text-slate-500">Usernames are 3–24 characters. Passwords need at least one letter and one number.</p>
        {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting} className="studio-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating account…' : 'Create account'}</button>
        <p className="text-center text-sm text-slate-400">Already registered? <Link to="/auth/login" className="text-aurora-300 hover:text-ember-300">Log in</Link></p>
      </form>

      <div className="studio-panel p-7 sm:p-10">
        <p className="studio-eyebrow">Portable practice</p>
        <h2 className="studio-title mt-3 text-5xl leading-none sm:text-6xl">Save the drills that move your accent</h2>
        <p className="mt-5 text-slate-300">Your account is ready for saved podcasts, episode progress, and future bookmarks without adding email delivery.</p>
        <button type="button" onClick={() => void startGithubLogin()} className="studio-button-ghost mt-8">Sign up with GitHub</button>
      </div>
    </section>
  )
}
