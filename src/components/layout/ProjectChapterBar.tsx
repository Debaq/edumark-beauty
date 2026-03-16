import { useRef, useEffect } from 'react'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * Barra de capítulos para proyectos .edmindex.
 * Visible en todos los modos excepto Libro (que fusiona todo).
 * Tabs con scroll horizontal, auto-scroll al activo.
 */
export function ProjectChapterBar() {
  const isProject = useDocumentStore((s) => s.isProject)
  const chapters = useDocumentStore((s) => s.chapters)
  const activeIndex = useDocumentStore((s) => s.activeChapterIndex)
  const setActiveChapter = useDocumentStore((s) => s.setActiveChapter)
  const contentMode = useContentModeStore((s) => s.contentMode)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al capítulo activo
  useEffect(() => {
    if (!scrollRef.current) return
    const active = scrollRef.current.children[activeIndex] as HTMLElement | undefined
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeIndex])

  if (!isProject || contentMode === 'book' || chapters.length <= 1) return null

  return (
    <div className="shrink-0 flex items-center bg-[var(--app-bg)] border-b border-[var(--app-border)] h-8 min-w-0">
      {/* Prev */}
      <button
        onClick={() => setActiveChapter(activeIndex - 1)}
        disabled={activeIndex === 0}
        className="px-1.5 h-full flex items-center text-[var(--app-fg3)] hover:text-[var(--app-fg1)]
          disabled:opacity-20 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Tabs */}
      <div
        ref={scrollRef}
        className="flex items-center gap-px flex-1 overflow-x-auto min-w-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {chapters.map((ch, i) => (
          <button
            key={ch.path}
            onClick={() => setActiveChapter(i)}
            title={ch.path}
            className={clsx(
              'px-3 h-8 text-[11px] font-medium whitespace-nowrap transition-all relative shrink-0',
              i === activeIndex
                ? 'text-[var(--app-accent)]'
                : 'text-[var(--app-fg3)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg1)]'
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className={clsx(
                'w-4 text-center text-[10px] rounded',
                i === activeIndex ? 'text-[var(--app-accent)]' : 'text-[var(--app-fg3)]'
              )}>
                {i + 1}
              </span>
              {ch.title}
            </span>
            {/* Indicador activo — línea inferior */}
            {i === activeIndex && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--app-accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Next */}
      <button
        onClick={() => setActiveChapter(activeIndex + 1)}
        disabled={activeIndex === chapters.length - 1}
        className="px-1.5 h-full flex items-center text-[var(--app-fg3)] hover:text-[var(--app-fg1)]
          disabled:opacity-20 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <ChevronRight size={14} />
      </button>

      {/* Counter */}
      <span className="text-[10px] text-[var(--app-fg3)] px-2 shrink-0 tabular-nums">
        {activeIndex + 1}/{chapters.length}
      </span>
    </div>
  )
}
