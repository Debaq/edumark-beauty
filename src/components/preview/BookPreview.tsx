import { useMemo, useRef, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { useBookLayoutStore } from '@/store/bookLayout'
import { useBookPagination } from '@/hooks/useBookPagination'
import { useQuestionInteractivity } from '@/hooks/useQuestionInteractivity'
import { generateThemeCss } from './previewTheme'
import { BookPage } from './book/BookPage'
import { BookToolbar } from './book/BookToolbar'
import { BookLayoutSelector } from './book/BookLayoutSelector'
import { BookBlockPanel } from './book/BookBlockPanel'
import { DEFAULT_BLOCK_PROPS } from '@/types/bookLayout'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityCss } from '@/lib/interactivity'
import '@/styles/book.css'

export function BookPreview() {
  const html = useDocumentStore((s) => s.html)
  const themeConfig = useThemeStore((s) => s.config)

  const layoutConfig = useBookLayoutStore((s) => s.layoutConfig)
  const isEditing = useBookLayoutStore((s) => s.isEditing)
  const selectedBlockId = useBookLayoutStore((s) => s.selectedBlockId)
  const selectedPageIndex = useBookLayoutStore((s) => s.selectedPageIndex)
  const selectBlock = useBookLayoutStore((s) => s.selectBlock)
  const setSelectedPageIndex = useBookLayoutStore((s) => s.setSelectedPageIndex)
  const setPageLayout = useBookLayoutStore((s) => s.setPageLayout)
  const moveBlock = useBookLayoutStore((s) => s.moveBlock)
  const initFromAutoPages = useBookLayoutStore((s) => s.initFromAutoPages)

  const {
    pages,
    measureRef,
    pageWidthPx,
    pageHeightPx,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  } = useBookPagination()

  const contentWidthPx = pageWidthPx - paddingLeft - paddingRight
  const contentHeightPx = pageHeightPx - paddingTop - paddingBottom

  const themeCssVars = useMemo(() => generateThemeCss(themeConfig), [themeConfig])

  // Book-mode theme: force white background, dark text
  const bookThemeCss = useMemo(() => {
    let css = themeCssVars
    css += `\n  --t-bg: #ffffff;`
    css += `\n  --t-bg1: #f8f9fa;`
    css += `\n  --t-bg2: #f0f1f3;`
    css += `\n  --t-fg: #1a1a1a;`
    css += `\n  --t-fg1: #2d2d2d;`
    css += `\n  --t-fg2: #555555;`
    css += `\n  --t-fg3: #888888;`
    css += `\n  --t-border: #e0e0e0;`
    css += `\n  --t-border-hover: #cccccc;`
    css += `\n  --t-card-header-bg: #f5f5f5;`
    css += `\n  --t-table-head: #f5f5f5;`
    css += `\n  --t-row-hover: #fafafa;`
    css += `\n  --t-muted-soft: #f5f5f5;`
    return css
  }, [themeCssVars])

  // Interactividad de preguntas
  const bookContainerRef = useRef<HTMLDivElement>(null)
  useQuestionInteractivity(bookContainerRef, html)

  // ── DnD setup ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || !layoutConfig) return

    const activeData = active.data.current as { pageIndex: number; nodeId: string } | undefined
    if (!activeData) return

    const fromPage = activeData.pageIndex
    const fromBlockId = activeData.nodeId

    // Determine destination page and index
    let toPage: number
    let toIndex: number

    const overId = over.id as string

    if (overId.startsWith('page-')) {
      // Dropped on a page droppable
      toPage = parseInt(overId.replace('page-', ''))
      toIndex = layoutConfig.pages[toPage]?.blockIds.length ?? 0
    } else {
      // Dropped on another block
      const overData = over.data.current as { pageIndex: number; nodeId: string } | undefined
      if (!overData) return
      toPage = overData.pageIndex
      const overIndex = layoutConfig.pages[toPage]?.blockIds.indexOf(overData.nodeId) ?? -1
      toIndex = overIndex >= 0 ? overIndex : 0
    }

    const fromIndex = layoutConfig.pages[fromPage]?.blockIds.indexOf(fromBlockId) ?? -1
    if (fromIndex < 0) return

    // Don't move if same position
    if (fromPage === toPage && fromIndex === toIndex) return

    moveBlock(fromPage, fromIndex, toPage, toIndex)
  }, [layoutConfig, moveBlock])

  // ── Ensure manual layout when editing ──
  const handleEnterEditing = useCallback(() => {
    if (!layoutConfig && pages.length > 0) {
      initFromAutoPages(pages.map((pageNodes) =>
        pageNodes.map((n) => ({ nodeId: n.nodeId }))
      ))
    }
  }, [layoutConfig, pages, initFromAutoPages])

  // When toggling edit, initialize manual layout if needed
  const toggleEditing = useBookLayoutStore((s) => s.toggleEditing)
  const handleToggleEditing = useCallback(() => {
    if (!isEditing) {
      handleEnterEditing()
    }
    toggleEditing()
  }, [isEditing, handleEnterEditing, toggleEditing])

  // Find which page the selected block is on
  const selectedBlockPage = useMemo(() => {
    if (!selectedBlockId || !layoutConfig) return -1
    return layoutConfig.pages.findIndex((p) => p.blockIds.includes(selectedBlockId))
  }, [selectedBlockId, layoutConfig])

  const selectedBlockProps = useMemo(() => {
    if (selectedBlockPage < 0 || !layoutConfig || !selectedBlockId) return undefined
    return layoutConfig.pages[selectedBlockPage]?.blockProps[selectedBlockId]
  }, [selectedBlockPage, layoutConfig, selectedBlockId])

  // Current page layout for layout selector
  const currentPageLayout = layoutConfig?.pages[selectedPageIndex]?.layout ?? 'stack'

  if (!html) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--app-fg3)]">
        <p className="text-sm">La vista de libro aparecera aqui...</p>
      </div>
    )
  }

  return (
    <div ref={bookContainerRef} className="edm-book-container h-full flex flex-col">
      <style>{previewBaseCss}{interactivityCss}</style>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />

      {/* Hidden measurement container */}
      <div
        ref={measureRef}
        className="edm-preview edm-book-measure"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: `${contentWidthPx}px`,
          visibility: 'hidden',
          background: '#ffffff',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`.edm-book-measure { ${bookThemeCss} }`}</style>

      {/* Scrollable page area */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="edm-book-pages" style={{ padding: '32px 16px' }}>
            {pages.map((pageNodes, i) => {
              const pageConf = layoutConfig?.pages[i]
              const layout = pageConf?.layout ?? 'stack'
              const blockProps = pageConf?.blockProps ?? {}

              return (
                <BookPage
                  key={i}
                  pageIndex={i}
                  nodes={pageNodes}
                  layout={layout}
                  blockProps={blockProps}
                  isEditing={isEditing}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={(id) => {
                    selectBlock(id)
                    setSelectedPageIndex(i)
                  }}
                  style={{
                    width: `${pageWidthPx}px`,
                    minHeight: `${pageHeightPx}px`,
                    paddingTop: `${paddingTop}px`,
                    paddingBottom: `${paddingBottom}px`,
                    paddingLeft: `${paddingLeft}px`,
                    paddingRight: `${paddingRight}px`,
                  }}
                  bookThemeCss={bookThemeCss}
                  contentWidthPx={contentWidthPx}
                  contentHeightPx={contentHeightPx}
                />
              )
            })}
          </div>

          <DragOverlay>
            {activeDragId ? (
              <div className="edm-book-block-dragging" style={{
                background: 'white',
                padding: '8px',
                borderRadius: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                opacity: 0.8,
                maxWidth: '300px',
              }}>
                <span className="text-xs text-gray-500">{activeDragId}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {themeConfig.customCss && <style>{themeConfig.customCss}</style>}

      {/* Block properties panel */}
      {isEditing && selectedBlockId && selectedBlockPage >= 0 && (
        <BookBlockPanel
          pageIndex={selectedBlockPage}
          blockId={selectedBlockId}
          blockProps={selectedBlockProps ?? DEFAULT_BLOCK_PROPS}
          onClose={() => selectBlock(null)}
        />
      )}

      {/* Layout selector (when editing and a page is selected) */}
      {isEditing && layoutConfig && (
        <BookLayoutSelector
          currentLayout={currentPageLayout}
          onSelectLayout={(layout) => setPageLayout(selectedPageIndex, layout)}
        />
      )}

      {/* Bottom toolbar */}
      <BookToolbar
        currentPage={selectedPageIndex}
        totalPages={pages.length}
        onPageChange={setSelectedPageIndex}
        onToggleEditing={handleToggleEditing}
      />
    </div>
  )
}
