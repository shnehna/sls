import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  placeholder = 'Search English podcasts...',
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
        className={`w-full rounded-[1.35rem] border border-white/10 bg-ink-950/[.78] text-paper-50 placeholder:text-paper-300/[.35] outline-none transition-colors focus:border-ember-300/[.55] ${
          compact ? 'px-4 py-3 pl-10 text-sm' : 'px-5 py-4 pl-12 text-base'
        }`}
      />
      <svg className={`absolute text-ember-300/[.62] ${compact ? 'left-3 top-3.5 w-5 h-5' : 'left-4 top-4 w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </form>
  )
}
