import { useRef, useCallback, useEffect, useState } from 'react'
import type { SvgTool } from './SvgToolbar'

interface ViewTransform {
  x: number
  y: number
  scale: number
}

interface Props {
  svgContent: string
  selectedIdx: number | null
  activeTool: SvgTool
  viewTransform: ViewTransform
  onViewTransformChange: (vt: ViewTransform) => void
  onSelectElement: (idx: number | null) => void
  onInteractionStart: () => void
  onMoveElement: (idx: number, dx: number, dy: number) => void
  onResizeBatch: (idx: number, attrs: Record<string, string>) => void
  onCreateShape: (tool: SvgTool, x: number, y: number, w: number, h: number) => void
}

const SKIP_TAGS = new Set(['defs', 'style', 'marker', 'clipPath', 'linearGradient', 'radialGradient', 'pattern', 'filter', 'symbol', 'use'])

/** Get index of selectable children (skipping defs, style, etc.) */
function getSelectableChildren(svgEl: SVGSVGElement): SVGElement[] {
  const children: SVGElement[] = []
  for (const child of Array.from(svgEl.children)) {
    if (child instanceof SVGElement && !SKIP_TAGS.has(child.tagName.toLowerCase())) {
      children.push(child)
    }
  }
  return children
}

/** Convert screen coordinates to SVG viewBox coordinates */
function screenToSvg(
  screenX: number,
  screenY: number,
  svgEl: SVGSVGElement,
  wrapEl: HTMLElement,
  vt: ViewTransform,
): { x: number; y: number } {
  const wrapRect = wrapEl.getBoundingClientRect()
  // Position relative to the SVG element in screen space
  const relX = (screenX - wrapRect.left - vt.x) / vt.scale
  const relY = (screenY - wrapRect.top - vt.y) / vt.scale

  // Convert pixel position to viewBox coordinates
  const vb = svgEl.viewBox.baseVal
  const svgW = svgEl.width.baseVal.value || svgEl.clientWidth || 300
  const svgH = svgEl.height.baseVal.value || svgEl.clientHeight || 200

  if (vb.width > 0 && vb.height > 0) {
    return {
      x: vb.x + (relX / svgW) * vb.width,
      y: vb.y + (relY / svgH) * vb.height,
    }
  }
  return { x: relX, y: relY }
}

/** Get bounding box of a selectable child in SVG viewport pixels */
function getElementBBox(el: SVGElement, svgEl: SVGSVGElement): DOMRect | null {
  try {
    if ('getBBox' in el && typeof el.getBBox === 'function') {
      const bbox = (el as SVGGraphicsElement).getBBox()
      // Convert from viewBox coords to SVG viewport pixels
      const vb = svgEl.viewBox.baseVal
      const svgW = svgEl.clientWidth || 300
      const svgH = svgEl.clientHeight || 200
      if (vb.width > 0 && vb.height > 0) {
        const scaleX = svgW / vb.width
        const scaleY = svgH / vb.height
        return new DOMRect(
          (bbox.x - vb.x) * scaleX,
          (bbox.y - vb.y) * scaleY,
          bbox.width * scaleX,
          bbox.height * scaleY,
        )
      }
      return bbox
    }
  } catch { /* ignore */ }
  return null
}

export function SvgCanvas({
  svgContent,
  selectedIdx,
  activeTool,
  viewTransform: vt,
  onViewTransformChange,
  onSelectElement,
  onInteractionStart,
  onMoveElement,
  onResizeBatch,
  onCreateShape,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStart = useRef<{ x: number; y: number; startVt?: ViewTransform } | null>(null)
  const createStart = useRef<{ x: number; y: number } | null>(null)
  const resizeInfo = useRef<{ corner: string; initBBox: DOMRect; tag: string } | null>(null)
  const [createPreview, setCreatePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selectionBox, setSelectionBox] = useState<DOMRect | null>(null)

  // Get the SVG DOM element from the rendered content
  const getSvgEl = useCallback((): SVGSVGElement | null => {
    return innerRef.current?.querySelector('svg') ?? null
  }, [])

  // Update selection box when content or selection changes
  useEffect(() => {
    if (selectedIdx == null) {
      setSelectionBox(null)
      return
    }
    const svgEl = getSvgEl()
    if (!svgEl) return
    const children = getSelectableChildren(svgEl)
    const el = children[selectedIdx]
    if (!el) { setSelectionBox(null); return }
    const bbox = getElementBBox(el, svgEl)
    setSelectionBox(bbox)
  }, [selectedIdx, svgContent, getSvgEl])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const wrap = wrapRef.current
    if (!wrap) return

    const rect = wrap.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const newScale = Math.max(0.1, Math.min(10, vt.scale * factor))

    // Zoom centered on mouse position
    const newX = mx - (mx - vt.x) * (newScale / vt.scale)
    const newY = my - (my - vt.y) * (newScale / vt.scale)

    onViewTransformChange({ x: newX, y: newY, scale: newScale })
  }, [vt, onViewTransformChange])

  // Mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current
    const svgEl = getSvgEl()
    if (!wrap || !svgEl) return

    // Middle mouse or space held → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      dragStart.current = { x: e.clientX, y: e.clientY, startVt: { ...vt } }
      return
    }

    if (e.button !== 0) return

    // If using a creation tool, start creating
    if (activeTool !== 'select') {
      const svgPt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      createStart.current = svgPt
      setIsCreating(true)
      setCreatePreview({ x: svgPt.x, y: svgPt.y, w: 0, h: 0 })
      return
    }

    // Select tool: find which element was clicked
    // Walk up from target to find the direct child of <svg>
    const target = e.target as Element
    const svgChildren = getSelectableChildren(svgEl)
    let clickedIdx: number | null = null

    let current: Element | null = target
    while (current && current !== svgEl && current !== wrap) {
      const idx = svgChildren.indexOf(current as SVGElement)
      if (idx >= 0) {
        clickedIdx = idx
        break
      }
      current = current.parentElement
    }

    if (clickedIdx != null) {
      onSelectElement(clickedIdx)
      onInteractionStart()
      // Start dragging
      const svgPt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      dragStart.current = { x: svgPt.x, y: svgPt.y }
      setIsDragging(true)
    } else {
      onSelectElement(null)
    }
  }, [activeTool, vt, getSvgEl, onSelectElement, onInteractionStart])

  // Compute new element attrs from resized bounding box
  const computeResizeAttrs = useCallback((
    tag: string, x: number, y: number, w: number, h: number,
  ): Record<string, string> => {
    const r = (n: number) => String(Math.round(n * 100) / 100)
    switch (tag) {
      case 'rect': case 'image': case 'foreignobject':
        return { x: r(x), y: r(y), width: r(Math.max(1, w)), height: r(Math.max(1, h)) }
      case 'ellipse':
        return { cx: r(x + w / 2), cy: r(y + h / 2), rx: r(Math.max(1, w / 2)), ry: r(Math.max(1, h / 2)) }
      case 'circle':
        return { cx: r(x + w / 2), cy: r(y + h / 2), r: r(Math.max(1, Math.min(w, h) / 2)) }
      default:
        return {}
    }
  }, [])

  // Mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current
    const svgEl = getSvgEl()

    if (isPanning && dragStart.current?.startVt) {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      onViewTransformChange({
        x: dragStart.current.startVt.x + dx,
        y: dragStart.current.startVt.y + dy,
        scale: dragStart.current.startVt.scale,
      })
      return
    }

    if (isResizing && selectedIdx != null && resizeInfo.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const { corner, initBBox, tag } = resizeInfo.current
      let { x, y, width, height } = initBBox

      // Adjust bounds based on corner being dragged
      if (corner.includes('w')) { width += x - pt.x; x = pt.x }
      if (corner.includes('n')) { height += y - pt.y; y = pt.y }
      if (corner.includes('e')) { width = pt.x - x }
      if (corner.includes('s')) { height = pt.y - y }

      // Prevent negative dimensions
      if (width < 1) { x += width - 1; width = 1 }
      if (height < 1) { y += height - 1; height = 1 }

      const attrs = computeResizeAttrs(tag, x, y, width, height)
      if (Object.keys(attrs).length > 0) {
        onResizeBatch(selectedIdx, attrs)
      }
      return
    }

    if (isCreating && createStart.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const sx = createStart.current.x
      const sy = createStart.current.y
      setCreatePreview({
        x: Math.min(sx, pt.x),
        y: Math.min(sy, pt.y),
        w: Math.abs(pt.x - sx),
        h: Math.abs(pt.y - sy),
      })
      return
    }

    if (isDragging && selectedIdx != null && dragStart.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const dx = pt.x - dragStart.current.x
      const dy = pt.y - dragStart.current.y
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        onMoveElement(selectedIdx, dx, dy)
        dragStart.current = { x: pt.x, y: pt.y }
      }
    }
  }, [isPanning, isCreating, isDragging, isResizing, selectedIdx, vt, getSvgEl, onViewTransformChange, onMoveElement, onResizeBatch, computeResizeAttrs])

  // Mouse up
  const handleMouseUp = useCallback(() => {
    if (isCreating && createStart.current && createPreview) {
      const { x, y, w, h } = createPreview
      if (w > 2 || h > 2 || activeTool === 'text') {
        onCreateShape(activeTool, x, y, Math.max(w, 10), Math.max(h, 10))
      }
      setCreatePreview(null)
      createStart.current = null
      setIsCreating(false)
    }
    setIsPanning(false)
    setIsDragging(false)
    setIsResizing(false)
    dragStart.current = null
    resizeInfo.current = null
  }, [isCreating, createPreview, activeTool, onCreateShape])

  // Listen for global mouseup to end drag even if cursor leaves canvas
  useEffect(() => {
    const up = () => {
      if (isPanning || isDragging || isResizing) {
        setIsPanning(false)
        setIsDragging(false)
        setIsResizing(false)
        dragStart.current = null
        resizeInfo.current = null
      }
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [isPanning, isDragging, isResizing])

  // Inject explicit width/height into SVG so it renders at a good size
  const preparedSvg = (() => {
    if (!svgContent) return ''
    // Extract viewBox dimensions to set explicit width/height
    const vbMatch = svgContent.match(/viewBox\s*=\s*"([^"]*)"/)
    if (vbMatch) {
      const parts = vbMatch[1].split(/[\s,]+/).map(Number)
      const vbW = parts[2] || 300
      const vbH = parts[3] || 200
      // If the SVG doesn't have explicit width/height, inject them
      if (!/\bwidth\s*=/.test(svgContent.split('>')[0])) {
        return svgContent.replace(/<svg\b/, `<svg width="${vbW}" height="${vbH}"`)
      }
    }
    return svgContent
  })()

  // Compute SVG element dimensions for the overlay
  const svgEl = getSvgEl()
  const svgW = svgEl?.clientWidth || svgEl?.viewBox?.baseVal?.width || 300
  const svgH = svgEl?.clientHeight || svgEl?.viewBox?.baseVal?.height || 200

  if (!svgContent) {
    return (
      <div className="edm-svg-canvas-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 13 }}>No se encontro contenido SVG</p>
      </div>
    )
  }

  return (
    <div
      ref={wrapRef}
      className={`edm-svg-canvas-wrap ${isPanning ? 'panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* SVG content — color: dark so currentColor SVG elements are visible on light bg */}
      <div
        ref={innerRef}
        className="edm-svg-canvas-inner"
        style={{
          transform: `translate(${vt.x}px, ${vt.y}px) scale(${vt.scale})`,
          color: '#1a1a1a',
        }}
        dangerouslySetInnerHTML={{ __html: preparedSvg }}
      />

      {/* Selection overlay */}
      {selectionBox && (
        <svg
          className="edm-svg-selection-overlay"
          style={{
            width: `${svgW}px`,
            height: `${svgH}px`,
            transform: `translate(${vt.x}px, ${vt.y}px) scale(${vt.scale})`,
            transformOrigin: '0 0',
          }}
        >
          <rect
            className="edm-svg-bbox"
            x={selectionBox.x - 2}
            y={selectionBox.y - 2}
            width={selectionBox.width + 4}
            height={selectionBox.height + 4}
          />
          {/* Corner handles */}
          {['nw', 'ne', 'sw', 'se'].map((corner) => {
            const hx = corner.includes('w') ? selectionBox.x - 2 : selectionBox.x + selectionBox.width + 2
            const hy = corner.includes('n') ? selectionBox.y - 2 : selectionBox.y + selectionBox.height + 2
            const cursor = corner === 'nw' || corner === 'se' ? 'nwse-resize'
              : 'nesw-resize'
            return (
              <rect
                key={corner}
                className="edm-svg-handle"
                x={hx - 4}
                y={hy - 4}
                rx={1}
                ry={1}
                style={{ cursor }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (selectedIdx == null) return
                  const svgEl = getSvgEl()
                  if (!svgEl) return
                  const children = getSelectableChildren(svgEl)
                  const el = children[selectedIdx]
                  if (!el) return
                  // Get element BBox in viewBox coords
                  try {
                    const bbox = (el as SVGGraphicsElement).getBBox()
                    onInteractionStart()
                    resizeInfo.current = {
                      corner,
                      initBBox: new DOMRect(bbox.x, bbox.y, bbox.width, bbox.height),
                      tag: el.tagName.toLowerCase(),
                    }
                    setIsResizing(true)
                  } catch { /* element doesn't support getBBox */ }
                }}
              />
            )
          })}
        </svg>
      )}

      {/* Creation preview */}
      {createPreview && createPreview.w > 0 && (
        <svg
          className="edm-svg-selection-overlay"
          style={{
            width: `${svgW}px`,
            height: `${svgH}px`,
            transform: `translate(${vt.x}px, ${vt.y}px) scale(${vt.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {activeTool === 'circle' ? (
            <ellipse
              className="edm-svg-creation-preview"
              cx={createPreview.x + createPreview.w / 2}
              cy={createPreview.y + createPreview.h / 2}
              rx={createPreview.w / 2}
              ry={createPreview.h / 2}
            />
          ) : activeTool === 'line' ? (
            <line
              className="edm-svg-creation-preview"
              x1={createPreview.x}
              y1={createPreview.y}
              x2={createPreview.x + createPreview.w}
              y2={createPreview.y + createPreview.h}
            />
          ) : (
            <rect
              className="edm-svg-creation-preview"
              x={createPreview.x}
              y={createPreview.y}
              width={createPreview.w}
              height={createPreview.h}
            />
          )}
        </svg>
      )}
    </div>
  )
}
