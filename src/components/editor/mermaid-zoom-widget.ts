import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.3
const ZOOM_MAX = 2.0
const ZOOM_DEFAULT = 1.0

let currentView: EditorView | null = null

function round(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * CodeMirror widget: +/− zoom buttons at the end of ```mermaid lines.
 * Stores the zoom level as a zoom="X" attribute on the parent :::diagram line.
 */
class MermaidZoomWidget extends WidgetType {
  zoom: number
  mermaidLineNum: number
  diagramLineNum: number | null

  constructor(zoom: number, mermaidLineNum: number, diagramLineNum: number | null) {
    super()
    this.zoom = zoom
    this.mermaidLineNum = mermaidLineNum
    this.diagramLineNum = diagramLineNum
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span')
    container.className = 'cm-mermaid-zoom'

    const minus = document.createElement('button')
    minus.className = 'cm-mermaid-zoom-btn'
    minus.textContent = '−'
    minus.title = 'Reducir diagrama'

    const label = document.createElement('span')
    label.className = 'cm-mermaid-zoom-label'
    label.textContent = `${Math.round(this.zoom * 100)}%`

    const plus = document.createElement('button')
    plus.className = 'cm-mermaid-zoom-btn'
    plus.textContent = '+'
    plus.title = 'Ampliar diagrama'

    minus.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const newZoom = Math.max(ZOOM_MIN, round(this.zoom - ZOOM_STEP))
      if (newZoom !== this.zoom) this.applyZoom(newZoom)
    })

    plus.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const newZoom = Math.min(ZOOM_MAX, round(this.zoom + ZOOM_STEP))
      if (newZoom !== this.zoom) this.applyZoom(newZoom)
    })

    container.append(minus, label, plus)
    return container
  }

  private applyZoom(newZoom: number) {
    const view = currentView
    if (!view || this.diagramLineNum == null) return

    const line = view.state.doc.line(this.diagramLineNum)
    const text = line.text

    if (newZoom === ZOOM_DEFAULT) {
      // Remove zoom attribute
      const newText = text.replace(/\s+zoom="[^"]*"/, '')
      view.dispatch({ changes: { from: line.from, to: line.to, insert: newText } })
    } else if (/zoom="[^"]*"/.test(text)) {
      // Update existing zoom attribute
      const newText = text.replace(/zoom="[^"]*"/, `zoom="${newZoom}"`)
      view.dispatch({ changes: { from: line.from, to: line.to, insert: newText } })
    } else {
      // Add zoom attribute at the end of the :::diagram line
      view.dispatch({ changes: { from: line.to, to: line.to, insert: ` zoom="${newZoom}"` } })
    }
  }

  eq(other: MermaidZoomWidget): boolean {
    return this.zoom === other.zoom && this.mermaidLineNum === other.mermaidLineNum
  }

  ignoreEvent(): boolean {
    return false
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc

  // First pass: find :::diagram lines and their zoom attributes
  const diagramLines = new Map<number, { lineNum: number; zoom: number }>()
  let blockStart = -1

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const trimmed = line.text.trimStart()

    if (/^:{3,}\s*diagram\b/.test(trimmed)) {
      blockStart = i
      const zoomMatch = trimmed.match(/zoom="([\d.]+)"/)
      const zoom = zoomMatch ? parseFloat(zoomMatch[1]) || ZOOM_DEFAULT : ZOOM_DEFAULT
      // Store this for all ```mermaid lines inside this block
      diagramLines.set(i, { lineNum: i, zoom })
      continue
    }

    if (blockStart > 0 && /^:{3,}\s*$/.test(trimmed)) {
      blockStart = -1
      continue
    }

    if (blockStart > 0 && /^```mermaid\b/.test(trimmed)) {
      const info = diagramLines.get(blockStart)
      if (info) {
        builder.add(
          line.to,
          line.to,
          Decoration.widget({
            widget: new MermaidZoomWidget(info.zoom, i, info.lineNum),
            side: 1,
          }),
        )
      }
    }
  }

  return builder.finish()
}

export const mermaidZoomWidget = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      currentView = view
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      currentView = update.view
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
)

export const mermaidZoomWidgetTheme = EditorView.theme({
  '.cm-mermaid-zoom': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    marginLeft: '8px',
    verticalAlign: 'middle',
  },
  '.cm-mermaid-zoom-btn': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    padding: '0',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '600',
    color: 'rgba(168, 85, 247, 0.9)',
    background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    lineHeight: '1',
    transition: 'all 0.15s',
    '&:hover': {
      background: 'rgba(168, 85, 247, 0.25)',
      borderColor: 'rgba(168, 85, 247, 0.6)',
      color: 'rgba(168, 85, 247, 1)',
    },
  },
  '.cm-mermaid-zoom-label': {
    display: 'inline-block',
    minWidth: '36px',
    textAlign: 'center',
    fontSize: '10px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    color: 'rgba(168, 85, 247, 0.8)',
    letterSpacing: '0.3px',
  },
})
