import { clsx } from 'clsx'
import type { PageLayout } from '@/types/bookLayout'

interface Props {
  currentLayout: PageLayout
  onSelectLayout: (layout: PageLayout) => void
}

const LAYOUTS: { id: PageLayout; label: string; icon: React.ReactNode }[] = [
  {
    id: 'stack',
    label: 'Una columna',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="4" width="20" height="2" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="6" y="9" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="6" y="14" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="6" y="19" width="14" height="2" rx="1" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'two-columns',
    label: 'Dos columnas',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="3" y="7" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="3" y="10" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="17" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="17" y="7" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="17" y="10" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <line x1="16" y1="3" x2="16" y2="21" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'grid-2x2',
    label: 'Grid 2x2',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="3" width="12" height="8" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="17" y="3" width="12" height="8" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="3" y="13" width="12" height="8" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="17" y="13" width="12" height="8" rx="1" fill="currentColor" opacity="0.15" />
      </svg>
    ),
  },
  {
    id: 'sidebar-left',
    label: 'Sidebar izquierda',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="3" width="8" height="18" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="13" y="4" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="13" y="7" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="13" y="10" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'sidebar-right',
    label: 'Sidebar derecha',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="4" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="3" y="7" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="3" y="10" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="21" y="3" width="8" height="18" rx="1" fill="currentColor" opacity="0.15" />
      </svg>
    ),
  },
]

export function BookLayoutSelector({ currentLayout, onSelectLayout }: Props) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-2 py-2 px-4
      border-t border-[var(--app-border)] bg-[var(--app-bg1)]">
      <span className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider mr-2">
        Layout
      </span>
      {LAYOUTS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onSelectLayout(id)}
          title={label}
          className={clsx(
            'w-10 h-7 rounded border transition-all p-0.5',
            currentLayout === id
              ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-bg2)]'
              : 'border-[var(--app-border)] text-[var(--app-fg3)] hover:border-[var(--app-fg2)] hover:text-[var(--app-fg2)]'
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
