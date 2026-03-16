import { useState, useCallback, useEffect, useRef } from 'react'
import { useUIStore } from '@/store/ui'
import { useDocumentStore } from '@/store/document'
import { replaceDiagramSvg } from '@/lib/svgSourcePatch'
import { SvgToolbar, type SvgTool } from './SvgToolbar'
import { SvgCanvas } from './SvgCanvas'
import { SvgPropertiesPanel, type ElementAttrs } from './SvgPropertiesPanel'
import '@/styles/svg-editor.css'

const MAX_UNDO = 50

const SKIP_TAGS = new Set(['defs', 'style', 'marker', 'clipPath', 'linearGradient', 'radialGradient', 'pattern', 'filter', 'symbol', 'use'])

/** Parse SVG string into a DOM element */
function parseSvg(svgString: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  const el = doc.documentElement
  if (el.tagName === 'svg') return el as unknown as SVGSVGElement
  return null
}

/** Serialize SVG DOM back to string */
function serializeSvg(svgEl: SVGSVGElement): string {
  const serializer = new XMLSerializer()
  let raw = serializer.serializeToString(svgEl)
  // Clean up common namespace noise
  raw = raw.replace(/ xmlns:NS\d+=""/g, '')
  raw = raw.replace(/ NS\d+:xmlns:[a-z]+="[^"]*"/g, '')
  return raw
}

/** Get selectable children of an SVG element */
function getSelectableChildren(svgEl: SVGSVGElement): Element[] {
  return Array.from(svgEl.children).filter(
    (c) => !SKIP_TAGS.has(c.tagName.toLowerCase())
  )
}

/** Read attributes of an element as a flat record */
function readElementAttrs(el: Element): ElementAttrs {
  const attrs: ElementAttrs = { tagName: el.tagName }
  for (const attr of Array.from(el.attributes)) {
    attrs[attr.name] = attr.value
  }
  // Special: text content
  if (el.tagName.toLowerCase() === 'text') {
    attrs._textContent = el.textContent ?? ''
  }
  return attrs
}

/** Move an SVG element by dx, dy in viewBox coordinates */
function moveElement(el: Element, dx: number, dy: number): void {
  const tag = el.tagName.toLowerCase()

  const shiftNum = (attr: string) => {
    const v = parseFloat(el.getAttribute(attr) ?? '0')
    el.setAttribute(attr, String(Math.round((v + dx) * 100) / 100))
  }
  const shiftNumY = (attr: string) => {
    const v = parseFloat(el.getAttribute(attr) ?? '0')
    el.setAttribute(attr, String(Math.round((v + dy) * 100) / 100))
  }

  switch (tag) {
    case 'rect':
    case 'image':
    case 'foreignobject':
      shiftNum('x')
      shiftNumY('y')
      break
    case 'circle':
    case 'ellipse':
      shiftNum('cx')
      shiftNumY('cy')
      break
    case 'line':
      shiftNum('x1'); shiftNumY('y1')
      shiftNum('x2'); shiftNumY('y2')
      break
    case 'text':
      shiftNum('x')
      shiftNumY('y')
      break
    case 'polygon':
    case 'polyline': {
      const pts = el.getAttribute('points') ?? ''
      const newPts = pts.replace(/[\d.e+-]+/g, (match) => {
        // This is a simplistic approach — alternate x,y
        return match
      })
      // Better: parse as pairs
      const pairs = pts.trim().split(/\s+/).map((pair) => {
        const [px, py] = pair.split(',').map(Number)
        return `${Math.round((px + dx) * 100) / 100},${Math.round((py + dy) * 100) / 100}`
      })
      el.setAttribute('points', pairs.join(' '))
      break
    }
    case 'path':
    case 'g':
    default: {
      // Use transform for anything else
      const existing = el.getAttribute('transform') ?? ''
      const translateMatch = existing.match(/translate\(([^)]+)\)/)
      if (translateMatch) {
        const [tx, ty] = translateMatch[1].split(/[,\s]+/).map(Number)
        const newTransform = existing.replace(
          /translate\([^)]+\)/,
          `translate(${Math.round((tx + dx) * 100) / 100}, ${Math.round((ty + dy) * 100) / 100})`
        )
        el.setAttribute('transform', newTransform)
      } else {
        const prefix = existing ? existing + ' ' : ''
        el.setAttribute('transform', `${prefix}translate(${Math.round(dx * 100) / 100}, ${Math.round(dy * 100) / 100})`)
      }
      break
    }
  }
}

export function SvgEditorPanel() {
  const diagramId = useUIStore((s) => s.svgEditorDiagramId)
  const originalSvg = useUIStore((s) => s.svgEditorOriginalSvg)
  const closeSvgEditor = useUIStore((s) => s.closeSvgEditor)
  const addToast = useUIStore((s) => s.addToast)

  const [svgContent, setSvgContent] = useState(originalSvg ?? '')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [activeTool, setActiveTool] = useState<SvgTool>('select')
  const [viewTransform, setViewTransform] = useState({ x: 40, y: 40, scale: 1 })

  // Sync when originalSvg changes (e.g. on open)
  useEffect(() => {
    if (originalSvg) setSvgContent(originalSvg)
  }, [originalSvg])

  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const [undoLen, setUndoLen] = useState(0)
  const [redoLen, setRedoLen] = useState(0)

  // Push current state to undo before a change
  const pushUndo = useCallback(() => {
    undoStackRef.current.push(svgContent)
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift()
    redoStackRef.current = []
    setUndoLen(undoStackRef.current.length)
    setRedoLen(0)
  }, [svgContent])

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const prev = undoStackRef.current.pop()!
    redoStackRef.current.push(svgContent)
    setSvgContent(prev)
    setUndoLen(undoStackRef.current.length)
    setRedoLen(redoStackRef.current.length)
  }, [svgContent])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(svgContent)
    setSvgContent(next)
    setUndoLen(undoStackRef.current.length)
    setRedoLen(redoStackRef.current.length)
  }, [svgContent])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo()
      } else if (
        (e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) ||
        (e.ctrlKey || e.metaKey) && e.key === 'y'
      ) {
        e.preventDefault(); redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIdx != null) { e.preventDefault(); handleDelete() }
      } else if (e.key === 'Escape') {
        setSelectedIdx(null)
        setActiveTool('select')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, selectedIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply SVG mutation with undo support
  const mutateSvg = useCallback((mutator: (svgEl: SVGSVGElement) => void) => {
    const svgEl = parseSvg(svgContent)
    if (!svgEl) return
    pushUndo()
    mutator(svgEl)
    setSvgContent(serializeSvg(svgEl))
  }, [svgContent, pushUndo])

  // Move element
  const handleMoveElement = useCallback((idx: number, dx: number, dy: number) => {
    const svgEl = parseSvg(svgContent)
    if (!svgEl) return
    const children = getSelectableChildren(svgEl)
    const el = children[idx]
    if (!el) return
    // Don't push undo on every mouse move — only on mouse down (handled in canvas)
    moveElement(el, dx, dy)
    setSvgContent(serializeSvg(svgEl))
  }, [svgContent])

  // We push undo only when drag starts
  const handleSelectElement = useCallback((idx: number | null) => {
    if (idx !== selectedIdx && idx != null) {
      // Push undo when starting to interact with a new element
      pushUndo()
    }
    setSelectedIdx(idx)
  }, [selectedIdx, pushUndo])

  // Resize element
  const handleResizeElement = useCallback((idx: number, attr: string, value: number) => {
    mutateSvg((svgEl) => {
      const children = getSelectableChildren(svgEl)
      const el = children[idx]
      if (el) el.setAttribute(attr, String(value))
    })
  }, [mutateSvg])

  // Delete selected
  const handleDelete = useCallback(() => {
    if (selectedIdx == null) return
    mutateSvg((svgEl) => {
      const children = getSelectableChildren(svgEl)
      const el = children[selectedIdx]
      if (el) el.remove()
    })
    setSelectedIdx(null)
  }, [selectedIdx, mutateSvg])

  // Create shape
  const handleCreateShape = useCallback((tool: SvgTool, x: number, y: number, w: number, h: number) => {
    mutateSvg((svgEl) => {
      const ns = 'http://www.w3.org/2000/svg'
      let el: Element | null = null

      switch (tool) {
        case 'rect':
          el = document.createElementNS(ns, 'rect')
          el.setAttribute('x', String(Math.round(x)))
          el.setAttribute('y', String(Math.round(y)))
          el.setAttribute('width', String(Math.round(w)))
          el.setAttribute('height', String(Math.round(h)))
          el.setAttribute('fill', 'none')
          el.setAttribute('stroke', 'currentColor')
          el.setAttribute('stroke-width', '1.5')
          break
        case 'circle':
          el = document.createElementNS(ns, 'ellipse')
          el.setAttribute('cx', String(Math.round(x + w / 2)))
          el.setAttribute('cy', String(Math.round(y + h / 2)))
          el.setAttribute('rx', String(Math.round(w / 2)))
          el.setAttribute('ry', String(Math.round(h / 2)))
          el.setAttribute('fill', 'none')
          el.setAttribute('stroke', 'currentColor')
          el.setAttribute('stroke-width', '1.5')
          break
        case 'line':
          el = document.createElementNS(ns, 'line')
          el.setAttribute('x1', String(Math.round(x)))
          el.setAttribute('y1', String(Math.round(y)))
          el.setAttribute('x2', String(Math.round(x + w)))
          el.setAttribute('y2', String(Math.round(y + h)))
          el.setAttribute('stroke', 'currentColor')
          el.setAttribute('stroke-width', '1.5')
          break
        case 'text':
          el = document.createElementNS(ns, 'text')
          el.setAttribute('x', String(Math.round(x)))
          el.setAttribute('y', String(Math.round(y + 14)))
          el.setAttribute('font-size', '13')
          el.setAttribute('fill', 'currentColor')
          el.textContent = 'Texto'
          break
      }

      if (el) {
        svgEl.appendChild(el)
        // Select the new element
        const newChildren = getSelectableChildren(svgEl)
        setSelectedIdx(newChildren.length - 1)
      }
    })
    setActiveTool('select')
  }, [mutateSvg])

  // Change attribute from properties panel
  const handleChangeAttr = useCallback((attr: string, value: string) => {
    if (selectedIdx == null) return
    mutateSvg((svgEl) => {
      const children = getSelectableChildren(svgEl)
      const el = children[selectedIdx]
      if (!el) return
      if (attr === '_textContent') {
        el.textContent = value
      } else {
        el.setAttribute(attr, value)
      }
    })
  }, [selectedIdx, mutateSvg])

  // Change viewBox
  const handleChangeViewBox = useCallback((viewBox: string) => {
    mutateSvg((svgEl) => {
      svgEl.setAttribute('viewBox', viewBox)
    })
  }, [mutateSvg])

  // Save — clean up the SVG before writing back to source
  const handleSave = useCallback(() => {
    if (!diagramId) return

    // Re-parse and re-serialize to get clean output
    const svgEl = parseSvg(svgContent)
    if (!svgEl) {
      addToast('Error: SVG invalido', 'error')
      return
    }

    // Remove width/height that were injected for the canvas display
    // (the spec says to use viewBox only)
    if (svgEl.hasAttribute('width') && svgEl.hasAttribute('viewBox')) {
      svgEl.removeAttribute('width')
      svgEl.removeAttribute('height')
    }

    const cleanSvg = serializeSvg(svgEl)

    const source = useDocumentStore.getState().source
    const newSource = replaceDiagramSvg(source, diagramId, cleanSvg)
    if (newSource !== source) {
      useDocumentStore.getState().setSource(newSource)
      addToast('SVG actualizado', 'success')
    } else {
      addToast('Sin cambios', 'info')
    }
    closeSvgEditor()
  }, [diagramId, svgContent, closeSvgEditor, addToast])

  // Cancel
  const handleCancel = useCallback(() => {
    closeSvgEditor()
  }, [closeSvgEditor])

  // Zoom helpers
  const zoomIn = useCallback(() => {
    setViewTransform((vt) => ({ ...vt, scale: Math.min(10, vt.scale * 1.2) }))
  }, [])
  const zoomOut = useCallback(() => {
    setViewTransform((vt) => ({ ...vt, scale: Math.max(0.1, vt.scale / 1.2) }))
  }, [])
  const fit = useCallback(() => {
    setViewTransform({ x: 40, y: 40, scale: 1 })
  }, [])

  // Get properties for selected element
  const selectedAttrs = (() => {
    if (selectedIdx == null) return null
    const svgEl = parseSvg(svgContent)
    if (!svgEl) return null
    const children = getSelectableChildren(svgEl)
    const el = children[selectedIdx]
    if (!el) return null
    return readElementAttrs(el)
  })()

  // Get viewBox
  const viewBox = (() => {
    const svgEl = parseSvg(svgContent)
    return svgEl?.getAttribute('viewBox') ?? '0 0 300 200'
  })()

  if (!diagramId || !originalSvg) {
    return (
      <div className="edm-svg-editor">
        <div className="flex-1 flex items-center justify-center text-[var(--app-fg3)]">
          <p>No hay diagrama seleccionado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="edm-svg-editor">
      <SvgToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        canUndo={undoLen > 0}
        canRedo={redoLen > 0}
        onUndo={undo}
        onRedo={redo}
        onDelete={handleDelete}
        hasSelection={selectedIdx != null}
        zoom={viewTransform.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fit}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      <div className="edm-svg-editor-body">
        <SvgCanvas
          svgContent={svgContent}
          selectedIdx={selectedIdx}
          activeTool={activeTool}
          viewTransform={viewTransform}
          onViewTransformChange={setViewTransform}
          onSelectElement={handleSelectElement}
          onMoveElement={handleMoveElement}
          onResizeElement={handleResizeElement}
          onCreateShape={handleCreateShape}
        />
        <SvgPropertiesPanel
          element={selectedAttrs}
          viewBox={viewBox}
          onChangeAttr={handleChangeAttr}
          onChangeViewBox={handleChangeViewBox}
        />
      </div>
    </div>
  )
}
