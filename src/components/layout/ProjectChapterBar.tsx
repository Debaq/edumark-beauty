import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * Barra de capítulos para proyectos .edmindex.
 * Se muestra en modo HTML y Presentación (no en Libro).
 */
export function ProjectChapterBar() {
  const isProject = useDocumentStore((s) => s.isProject)
  const chapters = useDocumentStore((s) => s.chapters)
  const activeIndex = useDocumentStore((s) => s.activeChapterIndex)
  const setActiveChapter = useDocumentStore((s) => s.setActiveChapter)
  const contentMode = useContentModeStore((s) => s.contentMode)

  // Solo mostrar en proyecto, fuera de modo libro
  if (!isProject || contentMode === 'book' || chapters.length <= 1) return null

  return (
    <div className="shrink-0 flex items-center gap-1 px-3 py-1.5
      bg-[var(--app-bg1)] border-b border-[var(--app-border)] overflow-x-auto">
      {/* Botón anterior */}
      <button
        onClick={() => setActiveChapter(activeIndex - 1)}
        disabled={activeIndex === 0}
        className="p-1 rounded text-[var(--app-fg3)] hover:text-[var(--app-fg1)]
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Tabs de capítulos */}
      <div className="flex items-center gap-0.5 overflow-x-auto min-w-0">
        {chapters.map((ch, i) => (
          <button
            key={ch.path}
            onClick={() => setActiveChapter(i)}
            title={ch.path}
            className={clsx(
              'px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all',
              i === activeIndex
                ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]'
                : 'text-[var(--app-fg3)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]'
            )}
          >
            {ch.title}
          </button>
        ))}
      </div>

      {/* Botón siguiente */}
      <button
        onClick={() => setActiveChapter(activeIndex + 1)}
        disabled={activeIndex === chapters.length - 1}
        className="p-1 rounded text-[var(--app-fg3)] hover:text-[var(--app-fg1)]
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <ChevronRight size={14} />
      </button>

      {/* Indicador */}
      <span className="text-[10px] text-[var(--app-fg3)] ml-1 shrink-0">
        {activeIndex + 1}/{chapters.length}
      </span>
    </div>
  )
}
