import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
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
import { useMermaid } from '@/hooks/useMermaid'
import { generateThemeCss } from './previewTheme'
import { BookPage } from './book/BookPage'
import { BookToolbar } from './book/BookToolbar'
import { BookBlockPanel } from './book/BookBlockPanel'
import { BookThumbnails } from './book/BookThumbnails'
import { BookConfigPanel } from './book/BookConfigPanel'
import { detectBlockInfo } from './book/BookBlock'
import { DEFAULT_BLOCK_PROPS } from '@/types/bookLayout'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityCss } from '@/lib/interactivity'
import '@/styles/book.css'

const ZOOM_STEPS = [0.25, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2]

export function BookPreview() {
  const html = useDocumentStore((s) => s.html)
  const themeConfig = useThemeStore((s) => s.config)

  const layoutConfig = useBookLayoutStore((s) => s.layoutConfig)
  const columnGap = layoutConfig?.columnGap ?? 24
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

  // Renderizar diagramas Mermaid
  useMermaid(bookContainerRef, html, themeConfig)

  // ── Zoom ──
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  const fitWidth = useCallback(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const available = el.clientWidth - 48 // 24px padding each side
    setZoom(Math.min(1.5, available / pageWidthPx))
  }, [pageWidthPx])

  const fitHeight = useCallback(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const available = el.clientHeight - 80 // padding top/bottom
    setZoom(Math.min(1.5, available / pageHeightPx))
  }, [pageHeightPx])

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_STEPS.find((s) => s > z + 0.001)
      return next ?? z
    })
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const prev = [...ZOOM_STEPS].reverse().find((s) => s < z - 0.001)
      return prev ?? z
    })
  }, [])

  // ── DnD setup ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

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

  // ── Undo/Redo keyboard shortcuts ──
  const undo = useBookLayoutStore((s) => s.undo)
  const redo = useBookLayoutStore((s) => s.redo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isEditing) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        (e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) ||
        (e.ctrlKey || e.metaKey) && e.key === 'y'
      ) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditing, undo, redo])

  // Clamp selectedPageIndex to valid range
  const safePageIndex = pages.length > 0 ? Math.min(selectedPageIndex, pages.length - 1) : 0

  // Scroll to page when selectedPageIndex changes (from toolbar or thumbnails)
  const scrollToPage = useCallback((pageIdx: number, behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const container = scrollAreaRef.current
      if (!container) return
      const pageEl = container.querySelector(`[data-page-index="${pageIdx}"]`) as HTMLElement
      if (pageEl) {
        pageEl.scrollIntoView({ block: 'start', behavior })
      }
    })
  }, [])

  // When page index changes via toolbar/thumbnail, scroll to it
  const prevPageRef = useRef(safePageIndex)
  const isScrollingRef = useRef(false)
  useEffect(() => {
    if (prevPageRef.current !== safePageIndex && !isScrollingRef.current) {
      scrollToPage(safePageIndex)
    }
    prevPageRef.current = safePageIndex
  }, [safePageIndex, scrollToPage])

  // Scroll to current page when entering edit mode
  const prevIsEditing = useRef(isEditing)
  useEffect(() => {
    if (isEditing !== prevIsEditing.current) {
      scrollToPage(safePageIndex, 'instant')
    }
    prevIsEditing.current = isEditing
  }, [isEditing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track which page is most visible during scroll (update thumbnail highlight)
  useEffect(() => {
    const container = scrollAreaRef.current
    if (!container || pages.length === 0) return

    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const containerRect = container.getBoundingClientRect()
        const midY = containerRect.top + containerRect.height * 0.3
        let closest = 0
        let closestDist = Infinity

        for (let i = 0; i < pages.length; i++) {
          const el = container.querySelector(`[data-page-index="${i}"]`) as HTMLElement
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const dist = Math.abs(rect.top - midY)
          if (dist < closestDist) {
            closestDist = dist
            closest = i
          }
        }

        if (closest !== useBookLayoutStore.getState().selectedPageIndex) {
          isScrollingRef.current = true
          setSelectedPageIndex(closest)
          requestAnimationFrame(() => { isScrollingRef.current = false })
        }
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [pages.length, setSelectedPageIndex])

  // Find which page the selected block is on
  const selectedBlockPage = useMemo(() => {
    if (!selectedBlockId || !layoutConfig) return -1
    return layoutConfig.pages.findIndex((p) => p.blockIds.includes(selectedBlockId))
  }, [selectedBlockId, layoutConfig])

  const selectedBlockProps = useMemo(() => {
    if (selectedBlockPage < 0 || !layoutConfig || !selectedBlockId) return undefined
    return layoutConfig.pages[selectedBlockPage]?.blockProps[selectedBlockId]
  }, [selectedBlockPage, layoutConfig, selectedBlockId])

  // Get HTML for selected block (for the panel)
  const selectedBlockHtml = useMemo(() => {
    if (!selectedBlockId) return ''
    for (const pageNodes of pages) {
      const node = pageNodes.find((n) => n.nodeId === selectedBlockId)
      if (node) return node.html
    }
    return ''
  }, [selectedBlockId, pages])

  // Page layouts array for thumbnails
  const pageLayouts = useMemo(
    () => pages.map((_, i) => layoutConfig?.pages[i]?.layout ?? 'stack'),
    [pages, layoutConfig],
  )

  // Drag overlay: show block info
  const dragOverlayInfo = useMemo(() => {
    if (!activeDragId) return null
    for (const pageNodes of pages) {
      const node = pageNodes.find((n) => n.nodeId === activeDragId)
      if (node) return detectBlockInfo(node.html)
    }
    return null
  }, [activeDragId, pages])

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

      {/* Main area: thumbnails sidebar + page view */}
      <div className="flex-1 overflow-hidden flex flex-row">
        {/* Thumbnails sidebar */}
        <BookThumbnails
          pages={pages}
          pageLayouts={pageLayouts}
          currentPage={safePageIndex}
          onSelectPage={setSelectedPageIndex}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
          bookThemeCss={bookThemeCss}
          columnGap={columnGap}
        />

        {/* Scrollable page area */}
        <div ref={scrollAreaRef} className="flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* All pages — continuous scroll in both modes */}
            <div
              className="edm-book-pages"
              style={{
                padding: isEditing ? '48px 16px 32px' : '32px 16px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
              }}
            >
              {pages.map((pageNodes, i) => {
                const pageConf = layoutConfig?.pages[i]
                const layout = pageConf?.layout ?? 'stack'
                const blockProps = pageConf?.blockProps ?? {}
                const pageBg = pageConf?.backgroundColor ?? layoutConfig?.backgroundColor

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
                    totalPages={pages.length}
                    columnGap={columnGap}
                    docTextAlign={layoutConfig?.textAlign}
                    backgroundColor={pageBg}
                    onChangeLayout={isEditing ? (layout) => setPageLayout(i, layout) : undefined}
                  />
                )
              })}
            </div>

            <DragOverlay>
              {activeDragId && dragOverlayInfo ? (
                <div style={{
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  opacity: 0.9,
                  maxWidth: '300px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{ fontSize: '14px' }}>{dragOverlayInfo.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>
                    {dragOverlayInfo.label}
                  </span>
                  {dragOverlayInfo.snippet && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      — {dragOverlayInfo.snippet}
                    </span>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {themeConfig.customCss && <style>{themeConfig.customCss}</style>}

      {/* Block properties panel */}
      {isEditing && selectedBlockId && selectedBlockPage >= 0 && (
        <BookBlockPanel
          pageIndex={selectedBlockPage}
          blockId={selectedBlockId}
          blockProps={selectedBlockProps ?? DEFAULT_BLOCK_PROPS}
          blockHtml={selectedBlockHtml}
          totalPages={pages.length}
          isTwoColumns={(layoutConfig?.pages[selectedBlockPage]?.layout ?? 'stack') === 'two-columns'}
          onClose={() => selectBlock(null)}
        />
      )}

      {/* Page config panel */}
      {showConfig && (
        <BookConfigPanel onClose={() => setShowConfig(false)} />
      )}

      {/* Bottom toolbar */}
      <BookToolbar
        currentPage={safePageIndex}
        totalPages={pages.length}
        onPageChange={setSelectedPageIndex}
        onToggleEditing={handleToggleEditing}
        showConfig={showConfig}
        onToggleConfig={() => setShowConfig((v) => !v)}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={fitWidth}
        onFitHeight={fitHeight}
      />
    </div>
  )
}
