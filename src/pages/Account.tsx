import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { startGithubLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Account() {
  const { user, identities, loading, changePassword, unlinkIdentity } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <section className="studio-panel p-8 text-slate-300">Loading account…</section>
  }

  if (!user) {
    return (
      <section className="studio-panel p-8 text-center">
        <p className="studio-eyebrow">Account</p>
        <h1 className="studio-title mt-3 text-4xl">Log in to manage your profile</h1>
        <Link to="/auth/login" className="studio-button-primary mt-7">Log in</Link>
      </section>
    )
  }

  const passwordIdentity = identities.find((identity) => identity.provider === 'password')
  const githubIdentity = identities.find((identity) => identity.provider === 'github')

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlink = async (identityId: string) => {
    setMessage(null)
    setError(null)
    try {
      await unlinkIdentity(identityId)
      setMessage('Identity unlinked')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlink identity')
    }
  }

  return (
    <section className="space-y-6">
      <div className="studio-panel p-7 sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-3xl border border-white/10 object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/10 font-display text-2xl font-bold text-white">{user.displayName.slice(0, 1).toUpperCase()}</div>
            )}
            <div>
              <p className="studio-eyebrow">Profile</p>
              <h1 className="font-display text-4xl font-bold text-white">{user.displayName}</h1>
              <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
            </div>
          </div>
          <Link to="/search?q=english learning" className="studio-button-ghost">Find practice feeds</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <div className="studio-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="studio-eyebrow">Login methods</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-white">Connected identities</h2>
            </div>
            {!githubIdentity && <button type="button" onClick={() => void startGithubLogin(true)} className="studio-button-primary">Bind GitHub</button>}
          </div>

          <div className="mt-6 space-y-3">
            {identities.map((identity) => (
              <div key={identity.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <div>
                  <p className="font-medium capitalize text-slate-100">{identity.provider}</p>
                  <p className="text-sm text-slate-400">{identity.providerUsername || identity.email || identity.providerUserId}</p>
                </div>
                <button type="button" onClick={() => void handleUnlink(identity.id)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-danger/40 hover:text-rose-200">Unlink</button>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="studio-card space-y-4 p-6">
          <div>
            <p className="studio-eyebrow">Security</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Change password</h2>
          </div>
          {!passwordIdentity && <p className="rounded-2xl border border-ember-300/20 bg-ember-300/10 px-4 py-3 text-sm text-amber-100">Password login is not enabled for this account yet.</p>}
          <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Current password" disabled={!passwordIdentity} className="w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 disabled:opacity-50" />
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="New password" disabled={!passwordIdentity} className="w-full rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500 disabled:opacity-50" />
          {message && <p className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
          {error && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          <button disabled={!passwordIdentity || submitting} className="studio-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>

      <div className="studio-card p-6">
        <p className="studio-eyebrow">Learning preferences</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-white">Shadowing defaults</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">First version preferences are shown here as account-level guidance; persistence can be added when a preferences table is introduced.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ['English level', 'B1 daily conversation'],
            ['Practice goal', 'Accent shadowing'],
            ['Session length', '15 minutes'],
            ['Playback speed', '1× default'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">{label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
