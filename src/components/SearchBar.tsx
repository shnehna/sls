import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'

interface Props {
  autoFocus?: boolean
  onSubmit?: () => void
  compact?: boolean
  placeholder?: string
}

export default function SearchBar({
  autoFocus = false,
  onSubmit,
  compact = false,
  placeholder = '搜索英文播客...',
}: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const query = value.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setValue('')
    onSubmit?.()
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-console border border-white/10 bg-ink-950/[.78] text-paper-50 placeholder:text-paper-300/[.35] outline-none transition-colors focus:border-ember-300/[.55] ${
          compact ? 'px-4 py-3 pl-10 text-sm' : 'px-5 py-4 pl-12 text-base'
        }`}
      />
      <MagnifyingGlass className={`absolute text-ember-300/[.62] ${compact ? 'left-3 top-3.5 h-5 w-5' : 'left-4 top-4 h-5 w-5'}`} weight="bold" aria-hidden="true" />
    </form>
  )
}
