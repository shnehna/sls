import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const levels = ['A2 打基础', 'B1 日常对话', 'B2 流畅听力', 'C1 接近母语速度']
const goals = ['听懂新闻', '职场会议', '旅行表达', '口音跟读']
const themes = ['每日短练', '长播客精听', '先看字幕再跟读']

export default function Onboarding() {
  const navigate = useNavigate()
  const [level, setLevel] = useState(levels[1])
  const [goal, setGoal] = useState(goals[0])
  const [theme, setTheme] = useState(themes[0])

  const finish = () => {
    navigate('/search?q=conversation', { replace: true })
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="studio-panel p-7 sm:p-10">
        <p className="studio-eyebrow">首次设置</p>
        <h1 className="studio-title mt-3 text-5xl leading-none sm:text-6xl">按你的练习方式调整 ShadowCast</h1>
        <p className="mt-5 max-w-2xl text-slate-300">这里先做轻量设置；等偏好表接入后，可以把这些选择长期保存。</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChoiceGroup title="英语水平" options={levels} value={level} onChange={setLevel} />
        <ChoiceGroup title="练习目标" options={goals} value={goal} onChange={setGoal} />
        <ChoiceGroup title="练习方式" options={themes} value={theme} onChange={setTheme} />
      </div>

      <div className="studio-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">已选择：{level} · {goal} · {theme}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/', { replace: true })} className="studio-button-ghost">跳过</button>
          <button type="button" onClick={finish} className="studio-button-primary">开始练习</button>
        </div>
      </div>
    </section>
  )
}

function ChoiceGroup({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="studio-card p-5">
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${value === option ? 'border-ember-300/50 bg-ember-300/15 text-amber-100' : 'border-white/10 bg-white/[.04] text-slate-300 hover:border-ember-300/35 hover:text-white'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
