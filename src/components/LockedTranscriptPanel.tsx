import { Link } from 'react-router-dom'
import { Check } from '@phosphor-icons/react'

export default function LockedTranscriptPanel() {
  return (
    <section className="studio-transcript-surface grid h-[calc(100dvh-30rem)] min-h-[14rem] place-items-center overflow-y-auto p-8 text-center lg:h-[calc(100dvh-26rem)] lg:min-h-0">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-paper-700/15 bg-white/50 font-semibold text-paper-900">SC</div>
        <h2 className="font-sans text-3xl font-semibold tracking-[-.02em] text-paper-900">登录后可使用字幕练习</h2>
        <p className="mt-4 text-sm leading-7 text-paper-700/75">
          登录后可以使用同步字幕、逐句跟读、AI 转写、书签和跨设备进度同步。
        </p>
        <div className="mt-6 grid gap-2 text-left text-sm text-paper-700/80 sm:grid-cols-2">
          {['同步字幕阅读', '逐句跟读', 'AI 转写', '书签和进度同步'].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-2xl border border-paper-700/10 bg-white/35 px-4 py-3">
              <Check className="h-4 w-4 flex-shrink-0 text-ember-500" weight="bold" aria-hidden="true" />
              <span>{item}</span>
            </div>
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
