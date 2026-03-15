import {
  PanelLeftClose, PanelRightClose, Columns2,
  Download, Settings, FileText, RotateCcw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore, type ViewMode } from '@/store/ui'
import { useDocumentStore } from '@/store/document'

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { mode: 'editor', icon: PanelLeftClose, label: 'Editor' },
  { mode: 'split', icon: Columns2, label: 'Dividido' },
  { mode: 'preview', icon: PanelRightClose, label: 'Vista previa' },
]

export function Toolbar() {
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen)
  const configPanelOpen = useUIStore((s) => s.configPanelOpen)
  const setConfigPanelOpen = useUIStore((s) => s.setConfigPanelOpen)
  const filename = useDocumentStore((s) => s.filename)
  const reset = useDocumentStore((s) => s.reset)

  return (
    <header className="h-12 bg-[var(--app-bg1)] border-b border-[var(--app-border)]
      flex items-center justify-between px-4 shrink-0">
      {/* Izquierda: logo + nombre de archivo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[var(--app-accent)]" />
          <span className="text-sm font-semibold text-[var(--app-fg)]">edumark-beauty</span>
        </div>
        {filename && (
          <>
            <span className="text-[var(--app-fg3)]">/</span>
            <span className="text-xs text-[var(--app-fg2)]">{filename}</span>
          </>
        )}
      </div>

      {/* Centro: modos de vista */}
      <div className="flex items-center gap-1 bg-[var(--app-bg)] rounded-lg p-0.5">
        {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            title={label}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === mode
                ? 'bg-[var(--app-accent)] text-white shadow-sm'
                : 'text-[var(--app-fg2)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]'
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setConfigPanelOpen(!configPanelOpen)}
          title="Configuracion de tema"
          className={clsx(
            'p-2 rounded-lg transition-colors',
            configPanelOpen
              ? 'bg-[var(--app-accent)] text-white'
              : 'text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] hover:text-[var(--app-fg1)]'
          )}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => setExportModalOpen(true)}
          title="Exportar"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--app-accent)]
            text-white text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Exportar</span>
        </button>
        <button
          onClick={reset}
          title="Cerrar documento"
          className="p-2 rounded-lg text-[var(--app-fg3)] hover:bg-[var(--app-bg2)]
            hover:text-[var(--app-fg2)] transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  )
}
