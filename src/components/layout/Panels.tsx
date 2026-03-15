import { useRef, useState, useCallback } from 'react'
import { useUIStore } from '@/store/ui'
import { EdmEditor } from '@/components/editor/EdmEditor'
import { Preview } from '@/components/preview/Preview'

export function Panels() {
  const viewMode = useUIStore((s) => s.viewMode)
  const [splitPercent, setSplitPercent] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

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
        <EdmEditor />
      </div>

      {/* Gutter */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 bg-[var(--app-border)] hover:bg-[var(--app-accent)] cursor-col-resize
          transition-colors shrink-0"
      />

      <div className="overflow-hidden" style={{ width: `${100 - splitPercent}%` }}>
        <Preview />
      </div>
    </div>
  )
}
