import { Link } from 'react-router-dom'

export default function LockedTranscriptPanel() {
  return (
    <section className="studio-transcript-surface grid min-h-[70vh] place-items-center p-8 text-center lg:h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-paper-700/15 bg-white/50 text-3xl text-paper-900">🔒</div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-paper-700/45">会员学习空间</p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-[-.05em] text-paper-900">登录后可使用字幕练习</h2>
        <p className="mt-4 text-sm leading-7 text-paper-700/75">
          登录后可以使用同步字幕、逐句跟读、AI 转写、书签和跨设备进度同步。
        </p>
        <div className="mt-6 grid gap-2 text-left text-sm text-paper-700/80 sm:grid-cols-2">
          {['同步字幕阅读', '逐句跟读', 'AI 转写', '书签和进度同步'].map((item) => (
            <div key={item} className="rounded-2xl border border-paper-700/10 bg-white/35 px-4 py-3">✓ {item}</div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/auth/login" className="rounded-full bg-paper-900 px-5 py-2.5 text-sm font-semibold text-paper-50 transition hover:bg-paper-800">登录</Link>
          <Link to="/auth/register" className="rounded-full border border-paper-700/15 px-5 py-2.5 text-sm font-semibold text-paper-800 transition hover:bg-white/40">创建账号</Link>
        </div>
      </div>
    </section>
  )
}
