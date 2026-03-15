import { clsx } from 'clsx'
import type { SlideTemplate } from '@/types/contentMode'

interface Props {
  currentSlide: number
  currentTemplate: SlideTemplate
  onSelectTemplate: (template: SlideTemplate) => void
}

const TEMPLATES: { id: SlideTemplate; label: string; icon: React.ReactNode }[] = [
  {
    id: 'cover',
    label: 'Portada',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="8" width="16" height="3" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="10" y="13" width="12" height="2" rx="1" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'content',
    label: 'Contenido',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="4" width="14" height="2" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="4" y="9" width="24" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="4" y="13" width="24" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="4" y="17" width="18" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'two-columns',
    label: '2 Columnas',
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
    id: 'image-text',
    label: 'Imagen + Texto',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="3" width="16" height="18" rx="1" fill="currentColor" opacity="0.15" />
        <rect x="21" y="5" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
        <rect x="21" y="9" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="21" y="12" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
        <rect x="21" y="15" width="6" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'full-media',
    label: 'Multimedia',
    icon: (
      <svg viewBox="0 0 32 24" className="w-full h-full">
        <rect x="1" y="1" width="30" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="3" width="26" height="18" rx="1" fill="currentColor" opacity="0.15" />
        <circle cx="16" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <polygon points="14,10 14,14 18,12" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
]

export function SlideTemplateSelector({ currentTemplate, onSelectTemplate }: Props) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-2 py-2 px-4
      border-t border-[var(--app-border)] bg-[var(--app-bg1)]">
      {TEMPLATES.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onSelectTemplate(id)}
          title={label}
          className={clsx(
            'w-10 h-7 rounded border transition-all p-0.5',
            currentTemplate === id
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
