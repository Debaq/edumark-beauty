import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { useUIStore } from '@/store/ui'

/**
 * CodeMirror widget: a small button that appears at the end of ```svg lines
 * inside :::diagram blocks. Clicking it opens the SVG editor.
 */
class SvgEditButtonWidget extends WidgetType {
  diagramId: string
  svgCode: string

  constructor(diagramId: string, svgCode: string) {
    super()
    this.diagramId = diagramId
    this.svgCode = svgCode
  }

  toDOM(): HTMLElement {
    const btn = document.createElement('button')
    btn.className = 'cm-svg-edit-btn'
    btn.textContent = 'Editar SVG'
    btn.title = 'Abrir editor visual de SVG'
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      useUIStore.getState().openSvgEditor(this.diagramId, this.svgCode)
    })
    return btn
  }

  eq(other: SvgEditButtonWidget): boolean {
    return this.diagramId === other.diagramId && this.svgCode === other.svgCode
  }

  ignoreEvent(): boolean {
    return false
  }
}

/** Extract diagram id and SVG content, then build decorations for ```svg lines */
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  let inDiagram = false
  let diagramId = ''
  let inSvgFence = false
  let svgLines: string[] = []

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const trimmed = line.text.trimStart()

    // Detect :::diagram opening
    if (!inDiagram && /^:{3,}\s*diagram\b/.test(trimmed)) {
      const idMatch = trimmed.match(/id\s*=\s*"([^"]*)"/)
      if (idMatch) {
        inDiagram = true
        diagramId = idMatch[1]
      }
      continue
    }

    // Detect ::: closing (end of diagram block)
    if (inDiagram && /^:{3,}\s*$/.test(trimmed)) {
      inDiagram = false
      inSvgFence = false
      svgLines = []
      diagramId = ''
      continue
    }

    if (!inDiagram) continue

    // Detect ```svg opening
    if (!inSvgFence && /^```svg\s*$/.test(trimmed)) {
      inSvgFence = true
      svgLines = []

      // Scan ahead to collect the full SVG content
      let svgContent = ''
      for (let j = i + 1; j <= doc.lines; j++) {
        const nextLine = doc.line(j).text
        if (/^```\s*$/.test(nextLine.trimStart())) {
          svgContent = svgLines.join('\n')
          break
        }
        svgLines.push(nextLine)
      }

      if (svgContent && diagramId) {
        builder.add(line.to, line.to, Decoration.widget({
          widget: new SvgEditButtonWidget(diagramId, svgContent),
          side: 1,
        }))
      }
      continue
    }

    // Detect ``` closing of SVG fence
    if (inSvgFence && /^```\s*$/.test(trimmed)) {
      inSvgFence = false
      svgLines = []
      continue
    }
  }

  return builder.finish()
}

export const svgEditWidget = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

/** Theme for the SVG edit button widget */
export const svgEditWidgetTheme = EditorView.theme({
  '.cm-svg-edit-btn': {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '1px 8px',
    fontSize: '10px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    letterSpacing: '0.3px',
    color: 'rgba(56, 189, 248, 0.9)',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    verticalAlign: 'middle',
    lineHeight: '18px',
    transition: 'all 0.15s',
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.2)',
      borderColor: 'rgba(56, 189, 248, 0.6)',
      color: 'rgba(56, 189, 248, 1)',
    },
  },
})
