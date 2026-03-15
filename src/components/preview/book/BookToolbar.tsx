import {
  Pencil, PencilOff, ChevronLeft, ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { useBookLayoutStore } from '@/store/bookLayout'

interface BookToolbarProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onToggleEditing: () => void
}

export function BookToolbar({ currentPage, totalPages, onPageChange, onToggleEditing }: BookToolbarProps) {
  const isEditing = useBookLayoutStore((s) => s.isEditing)
  const layoutConfig = useBookLayoutStore((s) => s.layoutConfig)
  const resetToAuto = useBookLayoutStore((s) => s.resetToAuto)

  const btnClass = (disabled?: boolean) =>
    `p-1.5 rounded-lg transition-colors text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`

  return (
    <div className="shrink-0 flex items-center justify-between py-2 px-4 border-t border-[var(--app-border)] bg-[var(--app-bg1)]">
      {/* Left: Edit toggle + reset */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleEditing}
          title={isEditing ? 'Salir del modo edicion' : 'Modo edicion'}
          className={`p-1.5 rounded-lg transition-colors ${
            isEditing
              ? 'text-[var(--app-accent)] bg-[var(--app-accent)]/10'
              : 'text-[var(--app-fg2)] hover:bg-[var(--app-bg2)]'
          }`}
        >
          {isEditing ? <PencilOff size={16} /> : <Pencil size={16} />}
        </button>

        {layoutConfig?.isManual && (
          <button
            onClick={resetToAuto}
            title="Volver a paginacion automatica"
            className="p-1.5 rounded-lg text-[var(--app-fg3)] hover:bg-[var(--app-bg2)] hover:text-[var(--app-fg2)] transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        )}

        {isEditing && (
          <span className="text-[10px] text-[var(--app-accent)] font-medium uppercase tracking-wider">
            Editando
          </span>
        )}
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 0}
          className={btnClass(currentPage <= 0)}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs min-w-[70px] text-center text-[var(--app-fg2)]">
          Pag {currentPage + 1} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className={btnClass(currentPage >= totalPages - 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Right: spacer for balance */}
      <div className="w-24" />
    </div>
  )
}
