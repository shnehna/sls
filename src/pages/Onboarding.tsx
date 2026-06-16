import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const levels = ['A2 building basics', 'B1 daily conversation', 'B2 fluent listening', 'C1 native-speed nuance']
const goals = ['News comprehension', 'Work meetings', 'Travel confidence', 'Accent shadowing']
const themes = ['Focused daily drills', 'Long-form podcast sessions', 'Transcript-first study']

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
        <p className="studio-eyebrow">First run</p>
        <h1 className="studio-title mt-3 text-5xl leading-none sm:text-6xl">Tune ShadowCast to your practice style</h1>
        <p className="mt-5 max-w-2xl text-slate-300">These preferences are a lightweight first pass; persistence can be wired once the preferences table is added.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChoiceGroup title="English level" options={levels} value={level} onChange={setLevel} />
        <ChoiceGroup title="Practice goal" options={goals} value={goal} onChange={setGoal} />
        <ChoiceGroup title="Session style" options={themes} value={theme} onChange={setTheme} />
      </div>

      <div className="studio-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Selected: {level} · {goal} · {theme}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/', { replace: true })} className="studio-button-ghost">Skip</button>
          <button type="button" onClick={finish} className="studio-button-primary">Start practicing</button>
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
            className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${value === option ? 'border-ember-300/50 bg-ember-300/15 text-amber-100' : 'border-white/10 bg-white/[.04] text-slate-300 hover:border-aurora-300/40 hover:text-white'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
