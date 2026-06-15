import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(params.get('error'))

  useEffect(() => {
    if (params.get('status') !== 'success') return

    let cancelled = false
    void refreshUser()
      .then((state) => {
        if (!cancelled) navigate(state.isFirstUse ? '/onboarding' : '/', { replace: true })
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not complete GitHub login')
      })

    return () => {
      cancelled = true
    }
  }, [navigate, params, refreshUser])

  return (
    <section className="mx-auto max-w-2xl">
      <div className="studio-panel p-8 text-center sm:p-10">
        <p className="studio-eyebrow">GitHub OAuth</p>
        {error ? (
          <>
            <h1 className="studio-title mt-3 text-4xl">Login needs another pass</h1>
            <p className="mt-4 text-slate-300">{friendlyError(error)}</p>
            <div className="mt-7 flex justify-center gap-3">
              <Link to="/auth/login" className="studio-button-primary">Back to login</Link>
              <Link to="/" className="studio-button-ghost">Go home</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="studio-title mt-3 text-4xl">正在完成登录…</h1>
            <p className="mt-4 text-slate-300">We are refreshing your ShadowCast session and preparing your practice room.</p>
          </>
        )}
      </div>
    </section>
  )
}

function friendlyError(error: string): string {
  const messages: Record<string, string> = {
    github_already_linked: 'That GitHub account is already linked to another ShadowCast user.',
    invalid_state: 'The GitHub login state expired or did not match. Please try again.',
    link_session_expired: 'Your session expired before GitHub returned. Log in and try linking again.',
    missing_github_config: 'GitHub OAuth is not configured for this environment yet.',
  }
  return messages[error] || error.replace(/_/g, ' ')
}
