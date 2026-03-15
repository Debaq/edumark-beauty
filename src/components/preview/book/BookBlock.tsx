import { useRef, useCallback, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { BookNode } from '@/hooks/useBookPagination'
import type { BlockProps } from '@/types/bookLayout'
import { useBookLayoutStore } from '@/store/bookLayout'
import { pxToMm } from '@/hooks/useBookPagination'

interface BookBlockProps {
  node: BookNode
  blockProps?: BlockProps
  isEditing: boolean
  isSelected: boolean
  onSelect: () => void
  pageIndex: number
  freeStyle?: React.CSSProperties
  containerWidth?: number
  containerHeight?: number
}

function detectBlockType(html: string): string | null {
  const match = html.match(/class="[^"]*edm-(\w+)/)
  if (match) return match[1]
  const tagMatch = html.match(/^<(h[1-6]|p|ul|ol|blockquote|pre|table|figure)[\s>]/)
  if (tagMatch) return tagMatch[1]
  return null
}

export function BookBlock({
  node,
  blockProps,
  isEditing,
  isSelected,
  onSelect,
  pageIndex,
  freeStyle,
  containerWidth,
  containerHeight,
}: BookBlockProps) {
  const isFree = blockProps?.positioning === 'free'
  const blockRef = useRef<HTMLDivElement>(null)

  // Sortable for grid blocks
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.nodeId,
    data: { pageIndex, nodeId: node.nodeId },
    disabled: !isEditing || isFree,
  })

  const sortableStyle: React.CSSProperties = isFree
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        gridColumn: blockProps?.gridSpan ? `span ${blockProps.gridSpan}` : undefined,
        order: blockProps?.order,
      }

  // ── Free block dragging ──
  const [isDraggingFree, setIsDraggingFree] = useState(false)
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const handleFreeMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isFree || !isEditing) return
    e.preventDefault()
    e.stopPropagation()
    const origX = (blockProps?.x ?? 0) / 25.4 * 96
    const origY = (blockProps?.y ?? 0) / 25.4 * 96
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, origX, origY }
    setIsDraggingFree(true)

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !blockRef.current) return
      const dx = ev.clientX - dragStartRef.current.startX
      const dy = ev.clientY - dragStartRef.current.startY
      const newX = Math.max(0, dragStartRef.current.origX + dx)
      const newY = Math.max(0, dragStartRef.current.origY + dy)
      blockRef.current.style.left = `${newX}px`
      blockRef.current.style.top = `${newY}px`
    }

    const handleMouseUp = (ev: MouseEvent) => {
      if (!dragStartRef.current) return
      const dx = ev.clientX - dragStartRef.current.startX
      const dy = ev.clientY - dragStartRef.current.startY
      let newX = Math.max(0, dragStartRef.current.origX + dx)
      let newY = Math.max(0, dragStartRef.current.origY + dy)
      if (containerWidth) newX = Math.min(newX, containerWidth - 20)
      if (containerHeight) newY = Math.min(newY, containerHeight - 20)

      useBookLayoutStore.getState().setBlockProps(pageIndex, node.nodeId, {
        positioning: 'free',
        x: pxToMm(newX),
        y: pxToMm(newY),
      })

      dragStartRef.current = null
      setIsDraggingFree(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [isFree, isEditing, blockProps, pageIndex, node.nodeId, containerWidth, containerHeight])

  // ── Free block resizing ──
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    if (!isFree || !isEditing) return
    e.preventDefault()
    e.stopPropagation()

    const el = blockRef.current
    if (!el) return
    const startW = el.offsetWidth
    const startH = el.offsetHeight
    const startX = e.clientX
    const startY = e.clientY

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let newW = startW
      let newH = startH

      if (corner.includes('e')) newW = Math.max(40, startW + dx)
      if (corner.includes('w')) newW = Math.max(40, startW - dx)
      if (corner.includes('s')) newH = Math.max(20, startH + dy)
      if (corner.includes('n')) newH = Math.max(20, startH - dy)

      el.style.width = `${newW}px`
      el.style.height = `${newH}px`
    }

    const handleMouseUp = () => {
      if (!el) return
      useBookLayoutStore.getState().setBlockProps(pageIndex, node.nodeId, {
        positioning: 'free',
        width: pxToMm(el.offsetWidth),
        height: pxToMm(el.offsetHeight),
      })
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [isFree, isEditing, pageIndex, node.nodeId])

  const blockType = isEditing ? detectBlockType(node.html) : null

  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      (blockRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      if (!isFree) setNodeRef(el)
    },
    [isFree, setNodeRef],
  )

  return (
    <div
      ref={combinedRef}
      className={`edm-book-block ${isEditing ? 'edm-book-block-editing' : ''} ${isSelected ? 'edm-book-block-selected' : ''} ${isDragging || isDraggingFree ? 'edm-book-block-dragging' : ''}`}
      style={{
        ...sortableStyle,
        ...(freeStyle || {}),
      }}
      onClick={(e) => {
        if (isEditing) {
          e.stopPropagation()
          onSelect()
        }
      }}
      data-edm-node-id={node.nodeId}
    >
      {/* Drag handle for grid blocks */}
      {isEditing && !isFree && (
        <div
          className="edm-book-block-handle"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Free block drag area */}
      {isEditing && isFree && (
        <div
          className="edm-book-block-handle edm-book-block-handle-free"
          onMouseDown={handleFreeMouseDown}
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Block type badge */}
      {isEditing && blockType && (
        <div className="edm-book-block-badge">{blockType}</div>
      )}

      {/* Block content */}
      <div
        dangerouslySetInnerHTML={{ __html: node.html }}
      />

      {/* Resize handles for free blocks */}
      {isEditing && isFree && isSelected && (
        <>
          <div className="edm-book-resize-handle edm-book-resize-se" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
          <div className="edm-book-resize-handle edm-book-resize-sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
          <div className="edm-book-resize-handle edm-book-resize-ne" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
          <div className="edm-book-resize-handle edm-book-resize-nw" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
          <div className="edm-book-resize-handle edm-book-resize-e" onMouseDown={(e) => handleResizeMouseDown(e, 'e')} />
          <div className="edm-book-resize-handle edm-book-resize-w" onMouseDown={(e) => handleResizeMouseDown(e, 'w')} />
          <div className="edm-book-resize-handle edm-book-resize-s" onMouseDown={(e) => handleResizeMouseDown(e, 's')} />
          <div className="edm-book-resize-handle edm-book-resize-n" onMouseDown={(e) => handleResizeMouseDown(e, 'n')} />
        </>
      )}
    </div>
  )
}
