import {
  Pencil, PencilOff, ChevronLeft, ChevronRight,
  RotateCcw, ZoomIn, ZoomOut, Maximize2, ArrowLeftRight,
} from 'lucide-react'
import { useBookLayoutStore } from '@/store/bookLayout'

interface BookToolbarProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onToggleEditing: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  onFitHeight: () => void
}

export function BookToolbar({
  currentPage, totalPages, onPageChange, onToggleEditing,
  zoom, onZoomIn, onZoomOut, onFitWidth, onFitHeight,
}: BookToolbarProps) {
  const isEditing = useBookLayoutStore((s) => s.isEditing)
  const layoutConfig = useBookLayoutStore((s) => s.layoutConfig)
  const resetToAuto = useBookLayoutStore((s) => s.resetToAuto)
  const setColumnGap = useBookLayoutStore((s) => s.setColumnGap)
  const columnGap = layoutConfig?.columnGap ?? 24
  const hasTwoColumns = layoutConfig?.pages.some((p) => p.layout === 'two-columns') ?? false

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

        {/* Column gap control — visible when editing and any page uses two-columns */}
        {isEditing && hasTwoColumns && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[var(--app-border)]">
            <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider whitespace-nowrap">
              Gap
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={4}
              value={columnGap}
              onChange={(e) => setColumnGap(parseInt(e.target.value))}
              className="w-16 h-1 accent-[var(--app-accent)]"
              title={`Espacio entre columnas: ${columnGap}px`}
            />
            <span className="text-[10px] text-[var(--app-fg3)] tabular-nums w-6 text-right">
              {columnGap}
            </span>
          </div>
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

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          title="Reducir"
          className={btnClass()}
        >
          <ZoomOut size={15} />
        </button>
        <span className="text-[11px] min-w-[40px] text-center text-[var(--app-fg3)] tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          title="Ampliar"
          className={btnClass()}
        >
          <ZoomIn size={15} />
        </button>
        <div className="w-px h-4 bg-[var(--app-border)] mx-1" />
        <button
          onClick={onFitWidth}
          title="Ajustar al ancho"
          className={btnClass()}
        >
          <ArrowLeftRight size={15} />
        </button>
        <button
          onClick={onFitHeight}
          title="Ajustar a la altura"
          className={btnClass()}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  )
}
