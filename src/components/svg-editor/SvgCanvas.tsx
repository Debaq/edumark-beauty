import { useRef, useCallback, useEffect, useState } from 'react'
import type { SvgTool } from './SvgToolbar'

interface ViewTransform {
  x: number
  y: number
  scale: number
}

interface Props {
  svgContent: string
  selectedIndices: number[]
  activeTool: SvgTool
  viewTransform: ViewTransform
  onViewTransformChange: (vt: ViewTransform) => void
  onSelectElements: (indices: number[]) => void
  onInteractionStart: () => void
  onMoveElements: (indices: number[], dx: number, dy: number) => void
  onResizeBatch: (idx: number, attrs: Record<string, string>) => void
  onCreateShape: (tool: SvgTool, x: number, y: number, w: number, h: number) => void
}

const SKIP_TAGS = new Set(['defs', 'style', 'marker', 'clipPath', 'linearGradient', 'radialGradient', 'pattern', 'filter', 'symbol', 'use'])

function getSelectableChildren(svgEl: SVGSVGElement): SVGElement[] {
  const children: SVGElement[] = []
  for (const child of Array.from(svgEl.children)) {
    if (child instanceof SVGElement && !SKIP_TAGS.has(child.tagName.toLowerCase())) {
      children.push(child)
    }
  }
  return children
}

function screenToSvg(
  screenX: number, screenY: number,
  svgEl: SVGSVGElement, wrapEl: HTMLElement, vt: ViewTransform,
): { x: number; y: number } {
  const wrapRect = wrapEl.getBoundingClientRect()
  const relX = (screenX - wrapRect.left - vt.x) / vt.scale
  const relY = (screenY - wrapRect.top - vt.y) / vt.scale
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

function getElementBBox(el: SVGElement, svgEl: SVGSVGElement): DOMRect | null {
  try {
    if ('getBBox' in el && typeof el.getBBox === 'function') {
      const bbox = (el as SVGGraphicsElement).getBBox()
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

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(a.x + a.w < b.x || b.x + b.width < a.x || a.y + a.h < b.y || b.y + b.height < a.y)
}

export function SvgCanvas({
  svgContent, selectedIndices, activeTool, viewTransform: vt,
  onViewTransformChange, onSelectElements, onInteractionStart,
  onMoveElements, onResizeBatch, onCreateShape,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isMarquee, setIsMarquee] = useState(false)
  const dragStart = useRef<{ x: number; y: number; startVt?: ViewTransform } | null>(null)
  const createStart = useRef<{ x: number; y: number } | null>(null)
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  const marqueeShift = useRef(false)
  const resizeInfo = useRef<{ corner: string; initBBox: DOMRect; tag: string } | null>(null)
  const pendingSingleSelect = useRef<number | null>(null)
  const dragDidMove = useRef(false)
  const [createPreview, setCreatePreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selectionBoxes, setSelectionBoxes] = useState<Map<number, DOMRect>>(new Map())

  const getSvgEl = useCallback((): SVGSVGElement | null => {
    return innerRef.current?.querySelector('svg') ?? null
  }, [])

  // Update selection boxes
  useEffect(() => {
    if (selectedIndices.length === 0) { setSelectionBoxes(new Map()); return }
    const svgEl = getSvgEl()
    if (!svgEl) return
    const children = getSelectableChildren(svgEl)
    const boxes = new Map<number, DOMRect>()
    for (const idx of selectedIndices) {
      const el = children[idx]
      if (!el) continue
      const bbox = getElementBBox(el, svgEl)
      if (bbox) boxes.set(idx, bbox)
    }
    setSelectionBoxes(boxes)
  }, [selectedIndices, svgContent, getSvgEl])

  // Native wheel listener with { passive: false } to prevent browser zoom
  const vtRef = useRef(vt)
  vtRef.current = vt
  const onVtChangeRef = useRef(onViewTransformChange)
  onVtChangeRef.current = onViewTransformChange

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = wrap.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const cv = vtRef.current
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.max(0.1, Math.min(10, cv.scale * factor))
      const newX = mx - (mx - cv.x) * (newScale / cv.scale)
      const newY = my - (my - cv.y) * (newScale / cv.scale)
      onVtChangeRef.current({ x: newX, y: newY, scale: newScale })
    }
    wrap.addEventListener('wheel', handler, { passive: false })
    return () => wrap.removeEventListener('wheel', handler)
  }, [])

  // Native listener to prevent browser auto-scroll on middle click
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const preventMiddle = (e: MouseEvent) => { if (e.button === 1) e.preventDefault() }
    const preventAux = (e: MouseEvent) => e.preventDefault()
    wrap.addEventListener('mousedown', preventMiddle)
    wrap.addEventListener('auxclick', preventAux)
    return () => {
      wrap.removeEventListener('mousedown', preventMiddle)
      wrap.removeEventListener('auxclick', preventAux)
    }
  }, [])

  // Mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current
    const svgEl = getSvgEl()
    if (!wrap || !svgEl) return

    // Middle mouse or Alt+Click → pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      dragStart.current = { x: e.clientX, y: e.clientY, startVt: { ...vt } }
      return
    }

    if (e.button !== 0) return

    // Creation tools
    if (activeTool !== 'select') {
      const svgPt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      createStart.current = svgPt
      setIsCreating(true)
      setCreatePreview({ x: svgPt.x, y: svgPt.y, w: 0, h: 0 })
      return
    }

    // Select tool: find clicked element
    const target = e.target as Element
    const svgChildren = getSelectableChildren(svgEl)
    let clickedIdx: number | null = null
    let current: Element | null = target
    while (current && current !== svgEl && current !== wrap) {
      const idx = svgChildren.indexOf(current as SVGElement)
      if (idx >= 0) { clickedIdx = idx; break }
      current = current.parentElement
    }

    if (clickedIdx != null) {
      dragDidMove.current = false
      pendingSingleSelect.current = null
      if (e.shiftKey) {
        // Shift+click: toggle in/out of selection
        if (selectedIndices.includes(clickedIdx)) {
          onSelectElements(selectedIndices.filter((i) => i !== clickedIdx))
        } else {
          onSelectElements([...selectedIndices, clickedIdx])
        }
      } else {
        if (selectedIndices.includes(clickedIdx)) {
          // Already selected — defer single-select to mouseup (allows multi-drag)
          pendingSingleSelect.current = clickedIdx
        } else {
          onSelectElements([clickedIdx])
        }
      }
      onInteractionStart()
      const svgPt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      dragStart.current = { x: svgPt.x, y: svgPt.y }
      setIsDragging(true)
    } else {
      // Empty space → start marquee selection
      if (!e.shiftKey) onSelectElements([])
      const svgPt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      marqueeStart.current = svgPt
      marqueeShift.current = e.shiftKey
      setIsMarquee(true)
      setMarqueeRect({ x: svgPt.x, y: svgPt.y, w: 0, h: 0 })
    }
  }, [activeTool, vt, selectedIndices, getSvgEl, onSelectElements, onInteractionStart])

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

    if (isResizing && selectedIndices.length === 1 && resizeInfo.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const { corner, initBBox, tag } = resizeInfo.current
      let { x, y, width, height } = initBBox
      if (corner.includes('w')) { width += x - pt.x; x = pt.x }
      if (corner.includes('n')) { height += y - pt.y; y = pt.y }
      if (corner.includes('e')) { width = pt.x - x }
      if (corner.includes('s')) { height = pt.y - y }
      if (width < 1) { x += width - 1; width = 1 }
      if (height < 1) { y += height - 1; height = 1 }
      const attrs = computeResizeAttrs(tag, x, y, width, height)
      if (Object.keys(attrs).length > 0) onResizeBatch(selectedIndices[0], attrs)
      return
    }

    if (isMarquee && marqueeStart.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const sx = marqueeStart.current.x, sy = marqueeStart.current.y
      setMarqueeRect({
        x: Math.min(sx, pt.x), y: Math.min(sy, pt.y),
        w: Math.abs(pt.x - sx), h: Math.abs(pt.y - sy),
      })
      return
    }

    if (isCreating && createStart.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const sx = createStart.current.x, sy = createStart.current.y
      setCreatePreview({
        x: Math.min(sx, pt.x), y: Math.min(sy, pt.y),
        w: Math.abs(pt.x - sx), h: Math.abs(pt.y - sy),
      })
      return
    }

    if (isDragging && selectedIndices.length > 0 && dragStart.current && wrap && svgEl) {
      const pt = screenToSvg(e.clientX, e.clientY, svgEl, wrap, vt)
      const dx = pt.x - dragStart.current.x
      const dy = pt.y - dragStart.current.y
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        dragDidMove.current = true
        pendingSingleSelect.current = null
        onMoveElements(selectedIndices, dx, dy)
        dragStart.current = { x: pt.x, y: pt.y }
      }
    }
  }, [isPanning, isCreating, isDragging, isResizing, isMarquee, selectedIndices, vt, getSvgEl, onViewTransformChange, onMoveElements, onResizeBatch, computeResizeAttrs])

  // Mouse up
  const handleMouseUp = useCallback(() => {
    // Pending single select (clicked already-selected element without dragging)
    if (isDragging && pendingSingleSelect.current != null && !dragDidMove.current) {
      onSelectElements([pendingSingleSelect.current])
    }
    pendingSingleSelect.current = null
    dragDidMove.current = false

    if (isCreating && createStart.current && createPreview) {
      const { x, y, w, h } = createPreview
      if (w > 2 || h > 2 || activeTool === 'text') {
        onCreateShape(activeTool, x, y, Math.max(w, 10), Math.max(h, 10))
      }
      setCreatePreview(null)
      createStart.current = null
      setIsCreating(false)
    }

    // Marquee selection: find elements within the rect
    if (isMarquee && marqueeRect) {
      const svgEl = getSvgEl()
      if (svgEl && (marqueeRect.w > 2 || marqueeRect.h > 2)) {
        const children = getSelectableChildren(svgEl)
        const hits: number[] = []
        for (let i = 0; i < children.length; i++) {
          try {
            const bbox = (children[i] as SVGGraphicsElement).getBBox()
            if (rectsIntersect(marqueeRect, bbox)) hits.push(i)
          } catch { /* skip */ }
        }
        if (marqueeShift.current) {
          const merged = new Set([...selectedIndices, ...hits])
          onSelectElements(Array.from(merged))
        } else {
          onSelectElements(hits)
        }
      }
      setMarqueeRect(null)
      marqueeStart.current = null
      setIsMarquee(false)
    }

    setIsPanning(false)
    setIsDragging(false)
    setIsResizing(false)
    dragStart.current = null
    resizeInfo.current = null
  }, [isDragging, isCreating, isMarquee, createPreview, marqueeRect, activeTool, selectedIndices, getSvgEl, onCreateShape, onSelectElements])

  // Global mouseup to end interactions even if cursor leaves canvas
  useEffect(() => {
    const up = () => {
      if (isPanning || isDragging || isResizing || isMarquee) {
        setIsPanning(false)
        setIsDragging(false)
        setIsResizing(false)
        setIsMarquee(false)
        setMarqueeRect(null)
        dragStart.current = null
        resizeInfo.current = null
        marqueeStart.current = null
        pendingSingleSelect.current = null
        dragDidMove.current = false
      }
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [isPanning, isDragging, isResizing, isMarquee])

  // Inject explicit width/height into SVG so it renders at a good size
  const preparedSvg = (() => {
    if (!svgContent) return ''
    const vbMatch = svgContent.match(/viewBox\s*=\s*"([^"]*)"/)
    if (vbMatch) {
      const parts = vbMatch[1].split(/[\s,]+/).map(Number)
      const vbW = parts[2] || 300
      const vbH = parts[3] || 200
      if (!/\bwidth\s*=/.test(svgContent.split('>')[0])) {
        return svgContent.replace(/<svg\b/, `<svg width="${vbW}" height="${vbH}"`)
      }
    }
    return svgContent
  })()

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

  const singleIdx = selectedIndices.length === 1 ? selectedIndices[0] : null

  return (
    <div
      ref={wrapRef}
      className={`edm-svg-canvas-wrap ${isPanning ? 'panning' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        ref={innerRef}
        className="edm-svg-canvas-inner"
        style={{
          transform: `translate(${vt.x}px, ${vt.y}px) scale(${vt.scale})`,
          color: '#1a1a1a',
        }}
        dangerouslySetInnerHTML={{ __html: preparedSvg }}
      />

      {/* Selection overlays */}
      {selectionBoxes.size > 0 && (
        <svg
          className="edm-svg-selection-overlay"
          style={{
            width: `${svgW}px`, height: `${svgH}px`,
            transform: `translate(${vt.x}px, ${vt.y}px) scale(${vt.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {Array.from(selectionBoxes.entries()).map(([idx, box]) => (
            <g key={idx}>
              <rect
                className="edm-svg-bbox"
                x={box.x - 2} y={box.y - 2}
                width={box.width + 4} height={box.height + 4}
              />
              {/* Corner resize handles only for single selection */}
              {singleIdx === idx && ['nw', 'ne', 'sw', 'se'].map((corner) => {
                const hx = corner.includes('w') ? box.x - 2 : box.x + box.width + 2
                const hy = corner.includes('n') ? box.y - 2 : box.y + box.height + 2
                const cursor = corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize'
                return (
                  <rect
                    key={corner}
                    className="edm-svg-handle"
                    x={hx - 4} y={hy - 4} rx={1} ry={1}
                    style={{ cursor }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (singleIdx == null) return
                      const svgEl = getSvgEl()
                      if (!svgEl) return
                      const children = getSelectableChildren(svgEl)
                      const el = children[singleIdx]
                      if (!el) return
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
            </g>
          ))}
        </svg>
      )}

      {/* Marquee selection preview */}
      {marqueeRect && marqueeRect.w > 0 && (
        <svg
          className="edm-svg-selection-overlay"
          style={{
            width: `${svgW}px`, height: `${svgH}px`,
            transform: `translate(${vt.x}px, ${vt.y}px) scale(${vt.scale})`,
            transformOrigin: '0 0',
          }}
        >
          <rect
            className="edm-svg-marquee-preview"
            x={marqueeRect.x} y={marqueeRect.y}
            width={marqueeRect.w} height={marqueeRect.h}
          />
        </svg>
      )}

      {/* Creation preview */}
      {createPreview && createPreview.w > 0 && (
        <svg
          className="edm-svg-selection-overlay"
          style={{
            width: `${svgW}px`, height: `${svgH}px`,
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
              x1={createPreview.x} y1={createPreview.y}
              x2={createPreview.x + createPreview.w}
              y2={createPreview.y + createPreview.h}
            />
          ) : (
            <rect
              className="edm-svg-creation-preview"
              x={createPreview.x} y={createPreview.y}
              width={createPreview.w} height={createPreview.h}
            />
          )}
        </svg>
      )}
    </div>
  )
}
