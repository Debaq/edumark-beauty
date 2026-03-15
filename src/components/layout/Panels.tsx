import { useRef, useState, useCallback, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { EdmEditor, type EdmEditorHandle } from '@/components/editor/EdmEditor'
import { Preview, type PreviewHandle } from '@/components/preview/Preview'

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

  // Scroll sync logic
  useEffect(() => {
    if (viewMode !== 'split' || !scrollSync) return

    const getScrollPercent = (el: HTMLElement) => {
      const max = el.scrollHeight - el.clientHeight
      return max > 0 ? el.scrollTop / max : 0
    }

    const setScrollPercent = (el: HTMLElement, percent: number) => {
      const max = el.scrollHeight - el.clientHeight
      el.scrollTop = percent * max
    }

    const editorScroller = editorRef.current?.getScroller()
    const previewScroller = previewRef.current?.getScroller()
    if (!editorScroller || !previewScroller) return

    const onEditorScroll = () => {
      if (isSyncing.current) return
      isSyncing.current = true
      setScrollPercent(previewScroller, getScrollPercent(editorScroller))
      requestAnimationFrame(() => { isSyncing.current = false })
    }

    const onPreviewScroll = () => {
      if (isSyncing.current) return
      isSyncing.current = true
      setScrollPercent(editorScroller, getScrollPercent(previewScroller))
      requestAnimationFrame(() => { isSyncing.current = false })
    }

    editorScroller.addEventListener('scroll', onEditorScroll, { passive: true })
    previewScroller.addEventListener('scroll', onPreviewScroll, { passive: true })

    return () => {
      editorScroller.removeEventListener('scroll', onEditorScroll)
      previewScroller.removeEventListener('scroll', onPreviewScroll)
    }
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
