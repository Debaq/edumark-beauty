import { useCallback } from 'react'

interface Props {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function Toggle({ label, value, onChange }: Props) {
  const handleClick = useCallback(() => onChange(!value), [value, onChange])

  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer" onClick={handleClick}>
      <span className="text-xs text-[var(--app-fg2)]">{label}</span>
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          value ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-bg2)]'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            value ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </label>
  )
}
