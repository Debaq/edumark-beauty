import { useRef, useState, useCallback, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { EdmEditor, type EdmEditorHandle } from '@/components/editor/EdmEditor'
import { PreviewRouter } from '@/components/preview/PreviewRouter'
import type { PreviewHandle } from '@/components/preview/Preview'
import { findSlideBoundaries } from '@/lib/slideParser'

/** Extract heading line numbers from .edm source */
function extractSourceHeadings(source: string): number[] {
  const lines = source.split('\n')
  const headings: number[] = []
  let inFence = false
  let inBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip fenced code blocks
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    // Skip ::: blocks (content inside won't produce top-level headings)
    if (/^:{3,}\s*\S+/.test(line)) {
      inBlock = true
      continue
    }
    if (/^:{3,}\s*$/.test(line)) {
      inBlock = false
      continue
    }
    if (inBlock) continue

    // Match ATX headings
    if (/^#{1,6}\s/.test(line)) {
      headings.push(i)
    }
  }
  return headings
}

/** Get heading elements from the preview DOM with their offsets */
function getPreviewHeadings(container: HTMLElement): HTMLElement[] {
  // Only top-level headings in .edm-preview, not inside cards
  const all = container.querySelectorAll<HTMLElement>(
    '.edm-preview > h1, .edm-preview > h2, .edm-preview > h3, .edm-preview > h4, .edm-preview > h5, .edm-preview > h6'
  )
  return Array.from(all)
}

export function Panels() {
  const viewMode = useUIStore((s) => s.viewMode)
  const scrollSync = useUIStore((s) => s.scrollSync)
  const toggleScrollSync = useUIStore((s) => s.toggleScrollSync)
  const contentMode = useContentModeStore((s) => s.contentMode)
  const currentSlide = useContentModeStore((s) => s.currentSlide)
  const setCurrentSlide = useContentModeStore((s) => s.setCurrentSlide)
  const slides = useContentModeStore((s) => s.slides)
  const [splitPercent, setSplitPercent] = useState(contentMode === 'presentation' ? 33 : 50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const html = useDocumentStore((s) => s.html)
  const source = useDocumentStore((s) => s.source)
  const editorRef = useRef<EdmEditorHandle>(null)
  const previewRef = useRef<PreviewHandle>(null)
  const isSyncing = useRef(false)

  // Adjust split ratio when content mode changes
  useEffect(() => {
    setSplitPercent(contentMode === 'presentation' ? 33 : 50)
  }, [contentMode])

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPercent(Math.max(20, Math.min(80, percent)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  // ── HTML mode: heading-based scroll sync ──
  useEffect(() => {
    if (viewMode !== 'split' || !scrollSync || contentMode !== 'html') return

    const timer = setTimeout(() => {
      const editorScroller = editorRef.current?.getScroller()
      const previewScroller = previewRef.current?.getScroller()
      if (!editorScroller || !previewScroller) return

      const editorView = editorRef.current?.getView?.()

      const buildMap = () => {
        if (!editorView) return null

        const source = editorView.state.doc.toString()
        const sourceLines = extractSourceHeadings(source)
        const previewHeadings = getPreviewHeadings(previewScroller)

        const count = Math.min(sourceLines.length, previewHeadings.length)
        if (count === 0) return null

        const map: { editorY: number; previewY: number }[] = []

        for (let i = 0; i < count; i++) {
          const lineInfo = editorView.state.doc.line(sourceLines[i] + 1)
          const editorY = editorView.lineBlockAt(lineInfo.from).top
          const previewY = previewHeadings[i].offsetTop
          map.push({ editorY, previewY })
        }

        const editorMax = editorScroller.scrollHeight
        const previewMax = previewScroller.scrollHeight
        map.push({ editorY: editorMax, previewY: previewMax })

        return map
      }

      const interpolate = (
        scrollTop: number,
        fromKey: 'editorY' | 'previewY',
        toKey: 'editorY' | 'previewY',
        map: { editorY: number; previewY: number }[]
      ): number => {
        let i = 0
        while (i < map.length - 1 && map[i + 1][fromKey] <= scrollTop) i++

        if (i >= map.length - 1) return map[map.length - 1][toKey]

        const from0 = map[i][fromKey]
        const from1 = map[i + 1][fromKey]
        const to0 = map[i][toKey]
        const to1 = map[i + 1][toKey]

        const range = from1 - from0
        if (range <= 0) return to0

        const t = (scrollTop - from0) / range
        return to0 + t * (to1 - to0)
      }

      const onEditorScroll = () => {
        if (isSyncing.current) return
        const map = buildMap()
        if (!map) return

        isSyncing.current = true
        const targetY = interpolate(editorScroller.scrollTop, 'editorY', 'previewY', map)
        previewScroller.scrollTop = targetY
        requestAnimationFrame(() => { isSyncing.current = false })
      }

      const onPreviewScroll = () => {
        if (isSyncing.current) return
        const map = buildMap()
        if (!map) return

        isSyncing.current = true
        const targetY = interpolate(previewScroller.scrollTop, 'previewY', 'editorY', map)
        editorScroller.scrollTop = targetY
        requestAnimationFrame(() => { isSyncing.current = false })
      }

      editorScroller.addEventListener('scroll', onEditorScroll, { passive: true })
      previewScroller.addEventListener('scroll', onPreviewScroll, { passive: true })

      return () => {
        editorScroller.removeEventListener('scroll', onEditorScroll)
        previewScroller.removeEventListener('scroll', onPreviewScroll)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [viewMode, scrollSync, contentMode, html])

  // ── Presentation mode: cursor ↔ currentSlide sync ──

  // Helper: get section start lines (first content line of each slide)
  const getSectionStarts = useCallback((src: string): number[] => {
    const boundaries = findSlideBoundaries(src)
    const lines = src.split('\n')
    const starts: number[] = []
    let lineStart = 0

    for (const bnd of boundaries) {
      const segment = lines.slice(lineStart, bnd).join('\n').trim()
      if (segment.length > 0) {
        for (let l = lineStart; l < bnd; l++) {
          if (lines[l].trim().length > 0) { starts.push(l); break }
        }
      }
      lineStart = bnd + 1
    }
    // Last segment
    const lastSegment = lines.slice(lineStart).join('\n').trim()
    if (lastSegment.length > 0) {
      for (let l = lineStart; l < lines.length; l++) {
        if (lines[l].trim().length > 0) { starts.push(l); break }
      }
    }

    return starts
  }, [])

  // Helper: which slide does a given line (0-based) belong to?
  const getSlideForLine = useCallback((lineNum: number, src: string): number => {
    const boundaries = findSlideBoundaries(src)
    const lines = src.split('\n')
    let slideIdx = 0
    let lineStart = 0

    for (const bnd of boundaries) {
      const segment = lines.slice(lineStart, bnd).join('\n').trim()
      if (lineNum <= bnd) {
        return segment.length > 0 ? slideIdx : Math.max(0, slideIdx - 1)
      }
      if (segment.length > 0) slideIdx++
      lineStart = bnd + 1
    }
    // Cursor is in the last segment
    return slideIdx
  }, [])

  // Cursor → slide: listen for cursor/selection changes in the editor
  useEffect(() => {
    if (viewMode !== 'split' || contentMode !== 'presentation') return
    if (slides.length === 0) return

    const editorView = editorRef.current?.getView?.()
    if (!editorView) return

    const checkCursor = () => {
      if (isSyncing.current) return
      const src = editorView.state.doc.toString()
      const cursorPos = editorView.state.selection.main.head
      const cursorLine = editorView.state.doc.lineAt(cursorPos).number - 1 // 0-based

      const targetSlide = getSlideForLine(cursorLine, src)
      const clamped = Math.max(0, Math.min(targetSlide, slides.length - 1))

      if (clamped !== useContentModeStore.getState().currentSlide) {
        isSyncing.current = true
        setCurrentSlide(clamped)
        requestAnimationFrame(() => { isSyncing.current = false })
      }
    }

    // Listen for any interaction that might move the cursor
    const dom = editorView.dom
    dom.addEventListener('keyup', checkCursor)
    dom.addEventListener('mouseup', checkCursor)
    dom.addEventListener('focus', checkCursor)

    // Also check on initial mount
    checkCursor()

    return () => {
      dom.removeEventListener('keyup', checkCursor)
      dom.removeEventListener('mouseup', checkCursor)
      dom.removeEventListener('focus', checkCursor)
    }
  }, [viewMode, contentMode, slides.length, source, setCurrentSlide, getSlideForLine])

  // Slide → cursor: when currentSlide changes, move cursor to first line of that section
  useEffect(() => {
    if (viewMode !== 'split' || contentMode !== 'presentation') return
    if (isSyncing.current) return

    const editorView = editorRef.current?.getView?.()
    if (!editorView) return

    const src = editorView.state.doc.toString()
    const starts = getSectionStarts(src)

    if (starts.length === 0) return

    const targetLine0 = starts[Math.min(currentSlide, starts.length - 1)]
    const lineInfo = editorView.state.doc.line(targetLine0 + 1) // 1-based

    // Only move cursor if it's not already in the target section
    const currentCursorLine = editorView.state.doc.lineAt(
      editorView.state.selection.main.head
    ).number - 1
    const currentSection = getSlideForLine(currentCursorLine, src)
    if (currentSection === currentSlide) return

    isSyncing.current = true
    editorView.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true,
    })
    editorView.focus()
    setTimeout(() => { isSyncing.current = false }, 100)
  }, [currentSlide, viewMode, contentMode, getSectionStarts, getSlideForLine])

  if (viewMode === 'editor') {
    return (
      <div className="flex-1 overflow-hidden">
        <EdmEditor />
      </div>
    )
  }

  if (viewMode === 'preview') {
    return (
      <div className="flex-1 overflow-hidden">
        <PreviewRouter />
      </div>
    )
  }

  // Split
  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <div className="overflow-hidden" style={{ width: `${splitPercent}%` }}>
        <EdmEditor ref={editorRef} />
      </div>

      {/* Gutter with sync toggle */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={toggleScrollSync}
          title={scrollSync ? 'Desactivar scroll sincronizado' : 'Activar scroll sincronizado'}
          className="p-2 text-[var(--app-fg2)] hover:text-[var(--app-accent)] transition-colors z-10"
        >
          {scrollSync ? <Lock size={16} /> : <Unlock size={16} />}
        </button>
        <div
          onMouseDown={handleMouseDown}
          className="flex-1 w-1 bg-[var(--app-border)] hover:bg-[var(--app-accent)] cursor-col-resize
            transition-colors"
        />
      </div>

      <div className="overflow-hidden" style={{ width: `${100 - splitPercent}%` }}>
        <PreviewRouter ref={previewRef} />
      </div>
    </div>
  )
}
