import { useCallback } from 'react'

interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  value: string
  options: readonly Option[] | Option[]
  onChange: (value: string) => void
}

export function Select({ label, value, options, onChange }: Props) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
    [onChange]
  )

  return (
    <label className="flex flex-col gap-1 py-1">
      <span className="text-xs text-[var(--app-fg2)]">{label}</span>
      <select
        value={value}
        onChange={handleChange}
        className="bg-[var(--app-bg2)] text-[var(--app-fg)] text-xs border border-[var(--app-border)]
          rounded-md px-2 py-1.5 outline-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
