import { useState, useRef, useEffect, useCallback } from 'react'
import {
  PanelLeftClose, PanelRightClose, Columns2,
  Download, Save, Settings, RotateCcw, HelpCircle,
  Monitor, Presentation, BookOpen, Sparkles, ChevronDown,
} from 'lucide-react'
import { isTauri, saveFile, quickSave } from '@/lib/fileAdapter'
import { confirm } from '@/lib/dialogs'
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
  const isProject = useDocumentStore((s) => s.isProject)
  const chapters = useDocumentStore((s) => s.chapters)
  const activeChapterIndex = useDocumentStore((s) => s.activeChapterIndex)
  const setActiveChapter = useDocumentStore((s) => s.setActiveChapter)
  const reset = useDocumentStore((s) => s.reset)
  const contentMode = useContentModeStore((s) => s.contentMode)
  const setContentMode = useContentModeStore((s) => s.setContentMode)

  const addToast = useUIStore((s) => s.addToast)

  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Guardar .edm o .edmindex (como ZIP con capítulos)
  const handleDownload = useCallback(async () => {
    const state = useDocumentStore.getState()

    if (!state.isProject) {
      // Tauri: guardar directo si ya hay ruta conocida
      if (await quickSave(state.source, state.filePath)) {
        useDocumentStore.setState({ dirty: false })
        addToast('Guardado', 'success')
        return
      }
      // Web o primera vez: diálogo / descarga
      const blob = new Blob([state.source], { type: 'text/plain;charset=utf-8' })
      await saveFile(blob, state.filename || 'documento.edm')
      useDocumentStore.setState({ dirty: false })
      addToast('Archivo .edm descargado', 'success')
      return
    }

    // Proyecto .edmindex → sincronizar capítulo actual y empaquetar ZIP
    state.syncChapterFromEditor()
    const updatedState = useDocumentStore.getState()

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // Agregar el .edmindex
    const indexName = updatedState.filename || 'proyecto.edmindex'
    zip.file(indexName, updatedState.indexSource)

    // Agregar cada capítulo con su ruta original
    for (const ch of updatedState.chapters) {
      zip.file(ch.path, ch.source)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const zipName = indexName.replace(/\.edmindex$/, '') + '.zip'
    await saveFile(blob, zipName)
    useDocumentStore.setState({ dirty: false })
    addToast('Proyecto descargado como ZIP', 'success')
  }, [addToast])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!chapterDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setChapterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [chapterDropdownOpen])

  return (
    <header className="h-10 bg-[var(--app-bg1)] border-b border-[var(--app-border)]
      flex items-center px-2 shrink-0 gap-2 min-w-0">
      {/* Izquierda: nombre de archivo + selector de capítulo */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        {!isTauri() && (
          <img src={`${import.meta.env.BASE_URL}icon-192.webp`} alt="Edumark" className="w-4 h-4 shrink-0" />
        )}
        {filename && (
          <span className="text-xs text-[var(--app-fg2)] truncate max-w-[140px]">{filename}</span>
        )}
        {isProject && chapters.length > 1 && contentMode !== 'book' && (
          <>
            <span className="text-[var(--app-fg3)]">/</span>
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setChapterDropdownOpen(!chapterDropdownOpen)}
                className="flex items-center gap-1 text-xs text-[var(--app-fg1)] hover:text-[var(--app-accent)]
                  transition-colors px-2 py-1 rounded-md hover:bg-[var(--app-bg2)]"
              >
                <span className="max-w-[200px] truncate">{chapters[activeChapterIndex]?.title}</span>
                <ChevronDown size={12} className={clsx('transition-transform', chapterDropdownOpen && 'rotate-180')} />
              </button>
              {chapterDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[240px] max-h-[320px] overflow-y-auto
                  bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-lg shadow-lg z-50 py-1">
                  {chapters.map((ch, i) => (
                    <button
                      key={ch.path}
                      onClick={() => {
                        setActiveChapter(i)
                        setChapterDropdownOpen(false)
                      }}
                      className={clsx(
                        'w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2',
                        i === activeChapterIndex
                          ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                          : 'text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] hover:text-[var(--app-fg1)]'
                      )}
                    >
                      <span className="text-[var(--app-fg3)] w-4 text-right shrink-0">{i + 1}</span>
                      <span className="truncate">{ch.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Centro: modo de contenido + modos de vista */}
      <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
        <div className="flex items-center gap-0.5 bg-[var(--app-bg)] rounded-lg p-0.5">
          {CONTENT_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setContentMode(mode)}
              title={label}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
                contentMode === mode
                  ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)] shadow-sm'
                  : 'text-[var(--app-fg3)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]'
              )}
            >
              <Icon size={13} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--app-border)]" />

        <div className="flex items-center gap-0.5 bg-[var(--app-bg)] rounded-lg p-0.5">
          {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={label}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
                viewMode === mode
                  ? 'bg-[var(--app-accent)] text-white shadow-sm'
                  : 'text-[var(--app-fg2)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]'
              )}
            >
              <Icon size={13} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setConfigPanelOpen(!configPanelOpen)}
          title="Configuracion de tema"
          className={clsx(
            'p-1.5 rounded-lg transition-colors',
            configPanelOpen
              ? 'bg-[var(--app-accent)] text-white'
              : 'text-[var(--app-fg1)] hover:bg-[var(--app-bg2)] hover:text-[var(--app-accent)]'
          )}
        >
          <Settings size={15} />
        </button>
        <button
          onClick={() => setSkillsModalOpen(true)}
          title="Prompts para LLMs"
          className="p-1.5 rounded-lg bg-amber-500
            text-white hover:bg-amber-400 transition-colors"
        >
          <Sparkles size={14} />
        </button>
        <button
          onClick={handleDownload}
          title={isProject ? 'Descargar proyecto como ZIP' : 'Descargar .edm'}
          className="p-1.5 rounded-lg text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]
            hover:text-[var(--app-accent)] transition-colors"
        >
          <Save size={15} />
        </button>
        <button
          onClick={() => setExportModalOpen(true)}
          title="Exportar"
          className="p-1.5 rounded-lg bg-[var(--app-accent)]
            text-white hover:opacity-90 transition-opacity"
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => setHelpModalOpen(true)}
          title="Ayuda"
          className="p-1.5 rounded-lg text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]
            hover:text-[var(--app-accent)] transition-colors"
        >
          <HelpCircle size={13} />
        </button>
        <button
          onClick={async () => {
            if (await confirm('¿Cerrar el documento actual? Los cambios no guardados se perderan.', 'Cerrar documento')) {
              reset()
            }
          }}
          title="Cerrar documento"
          className="p-1.5 rounded-lg text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]
            hover:text-[var(--app-accent)] transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  )
}
