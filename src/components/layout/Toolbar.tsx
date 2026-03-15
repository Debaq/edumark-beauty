import {
  PanelLeftClose, PanelRightClose, Columns2,
  Download, Settings, FileText, RotateCcw, HelpCircle,
  Monitor, Presentation, BookOpen, Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore, type ViewMode } from '@/store/ui'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import type { ContentMode } from '@/types/contentMode'

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { mode: 'editor', icon: PanelLeftClose, label: 'Editor' },
  { mode: 'split', icon: Columns2, label: 'Dividido' },
  { mode: 'preview', icon: PanelRightClose, label: 'Vista previa' },
]

const CONTENT_MODES: { mode: ContentMode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { mode: 'html', icon: Monitor, label: 'HTML' },
  { mode: 'presentation', icon: Presentation, label: 'Presentacion' },
  { mode: 'book', icon: BookOpen, label: 'Libro' },
]

export function Toolbar() {
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const setExportModalOpen = useUIStore((s) => s.setExportModalOpen)
  const configPanelOpen = useUIStore((s) => s.configPanelOpen)
  const setConfigPanelOpen = useUIStore((s) => s.setConfigPanelOpen)
  const setHelpModalOpen = useUIStore((s) => s.setHelpModalOpen)
  const setSkillsModalOpen = useUIStore((s) => s.setSkillsModalOpen)
  const filename = useDocumentStore((s) => s.filename)
  const reset = useDocumentStore((s) => s.reset)
  const contentMode = useContentModeStore((s) => s.contentMode)
  const setContentMode = useContentModeStore((s) => s.setContentMode)

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

      {/* Centro: modo de contenido + modos de vista */}
      <div className="flex items-center gap-3">
        {/* Content mode selector */}
        <div className="flex items-center gap-1 bg-[var(--app-bg)] rounded-lg p-0.5">
          {CONTENT_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setContentMode(mode)}
              title={label}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                contentMode === mode
                  ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)] shadow-sm'
                  : 'text-[var(--app-fg3)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]'
              )}
            >
              <Icon size={14} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[var(--app-border)]" />

        {/* View mode selector */}
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
              : 'text-[var(--app-fg1)] hover:bg-[var(--app-bg2)] hover:text-[var(--app-accent)]'
          )}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => setSkillsModalOpen(true)}
          title="Prompts para LLMs"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500
            text-white text-xs font-medium hover:bg-amber-400 transition-colors"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Skills</span>
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
          onClick={() => setHelpModalOpen(true)}
          title="Ayuda"
          className="p-2 rounded-lg text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]
            hover:text-[var(--app-accent)] transition-colors"
        >
          <HelpCircle size={14} />
        </button>
        <button
          onClick={reset}
          title="Cerrar documento"
          className="p-2 rounded-lg text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]
            hover:text-[var(--app-accent)] transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  )
}
