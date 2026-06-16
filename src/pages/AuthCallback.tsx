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
        if (!cancelled) setError(err instanceof Error ? err.message : '无法完成 GitHub 登录')
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
            <h1 className="studio-title mt-3 text-4xl">登录需要重试</h1>
            <p className="mt-4 text-slate-300">{friendlyError(error)}</p>
            <div className="mt-7 flex justify-center gap-3">
              <Link to="/auth/login" className="studio-button-primary">返回登录</Link>
              <Link to="/" className="studio-button-ghost">回到首页</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="studio-title mt-3 text-4xl">正在完成登录…</h1>
            <p className="mt-4 text-slate-300">正在刷新你的 ShadowCast 会话，并准备练习空间。</p>
          </>
        )}
      </div>
    </section>
  )
}

function friendlyError(error: string): string {
  const messages: Record<string, string> = {
    github_already_linked: '这个 GitHub 账号已经绑定到另一个 ShadowCast 用户。',
    invalid_state: 'GitHub 登录状态已过期或不匹配，请重试。',
    link_session_expired: 'GitHub 返回前会话已过期，请重新登录后再绑定。',
    missing_github_config: '当前环境还没有配置 GitHub OAuth。',
  }
  return messages[error] || error.replace(/_/g, ' ')
}
