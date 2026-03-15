import { useRef, useState, useCallback, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { EdmEditor, type EdmEditorHandle } from '@/components/editor/EdmEditor'
import { Preview, type PreviewHandle } from '@/components/preview/Preview'

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
  const [splitPercent, setSplitPercent] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const editorRef = useRef<EdmEditorHandle>(null)
  const previewRef = useRef<PreviewHandle>(null)
  const isSyncing = useRef(false)

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

  // Heading-based scroll sync
  useEffect(() => {
    if (viewMode !== 'split' || !scrollSync) return

    // Small delay to let the DOM settle after content changes
    const timer = setTimeout(() => {
      const editorScroller = editorRef.current?.getScroller()
      const previewScroller = previewRef.current?.getScroller()
      if (!editorScroller || !previewScroller) return

      const editorView = editorRef.current?.getView?.()

      // Build heading mapping
      const buildMap = () => {
        if (!editorView) return null

        const source = editorView.state.doc.toString()
        const sourceLines = extractSourceHeadings(source)
        const previewHeadings = getPreviewHeadings(previewScroller)

        // Match by order — min of both lengths
        const count = Math.min(sourceLines.length, previewHeadings.length)
        if (count === 0) return null

        const map: { editorY: number; previewY: number }[] = []

        for (let i = 0; i < count; i++) {
          // Editor: get pixel offset of the heading line
          const lineInfo = editorView.state.doc.line(sourceLines[i] + 1) // 1-based
          const editorY = editorView.lineBlockAt(lineInfo.from).top

          // Preview: offset relative to scroller
          const previewY = previewHeadings[i].offsetTop
          map.push({ editorY, previewY })
        }

        // Add end boundaries
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
        // Find the segment the scroll position falls in
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
  }, [viewMode, scrollSync])

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
        <Preview />
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
          className="p-1.5 text-[var(--app-fg3)] hover:text-[var(--app-accent)] transition-colors z-10"
        >
          {scrollSync ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <div
          onMouseDown={handleMouseDown}
          className="flex-1 w-1 bg-[var(--app-border)] hover:bg-[var(--app-accent)] cursor-col-resize
            transition-colors"
        />
      </div>

      <div className="overflow-hidden" style={{ width: `${100 - splitPercent}%` }}>
        <Preview ref={previewRef} />
      </div>
    </div>
  )
}
