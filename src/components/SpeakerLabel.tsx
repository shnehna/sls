import { speakerColor } from '../utils/format'

interface Props {
  name?: string
  role?: string
}

export default function SpeakerLabel({ name, role }: Props) {
  const label = name || 'Narrator'
  const color = speakerColor(label)

  return (
    <span
      className="speaker-badge"
      style={{
        color,
        borderColor: `${color}33`,
        backgroundColor: `${color}0D`,
      }}
      title={role}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
