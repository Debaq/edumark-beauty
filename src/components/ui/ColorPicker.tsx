import { useCallback } from 'react'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ label, value, onChange }: Props) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange]
  )

  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-[var(--app-fg2)] truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-6 h-6 rounded-md border border-[var(--app-border)]"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={handleChange}
          className="w-6 h-6 cursor-pointer bg-transparent border-0 p-0"
        />
      </div>
    </label>
  )
}
