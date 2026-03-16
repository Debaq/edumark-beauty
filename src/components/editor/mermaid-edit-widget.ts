import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { useUIStore } from '@/store/ui'

/**
 * CodeMirror widget: a small button that appears at the end of ```mermaid lines
 * inside :::diagram blocks. Clicking it opens the Mermaid editor.
 */
class MermaidEditButtonWidget extends WidgetType {
  diagramId: string
  code: string

  constructor(diagramId: string, code: string) {
    super()
    this.diagramId = diagramId
    this.code = code
  }

  toDOM(): HTMLElement {
    const btn = document.createElement('button')
    btn.className = 'cm-mermaid-edit-btn'
    btn.textContent = 'Editar Mermaid'
    btn.title = 'Abrir editor de Mermaid con preview en vivo'
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      useUIStore.getState().openMermaidEditor(this.diagramId, this.code)
    })
    return btn
  }

  eq(other: MermaidEditButtonWidget): boolean {
    return this.diagramId === other.diagramId && this.code === other.code
  }

  ignoreEvent(): boolean {
    return false
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  let inDiagram = false
  let diagramId = ''

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

    // Detect ::: closing
    if (inDiagram && /^:{3,}\s*$/.test(trimmed)) {
      inDiagram = false
      diagramId = ''
      continue
    }

    if (!inDiagram) continue

    // Detect ```mermaid opening
    if (/^```mermaid\b/.test(trimmed)) {
      // Scan ahead to collect the full Mermaid content
      const codeLines: string[] = []
      for (let j = i + 1; j <= doc.lines; j++) {
        const nextLine = doc.line(j).text
        if (/^```\s*$/.test(nextLine.trimStart())) break
        codeLines.push(nextLine)
      }

      const codeContent = codeLines.join('\n')
      if (codeContent && diagramId) {
        builder.add(line.to, line.to, Decoration.widget({
          widget: new MermaidEditButtonWidget(diagramId, codeContent),
          side: 1,
        }))
      }
    }
  }

  return builder.finish()
}

export const mermaidEditWidget = ViewPlugin.fromClass(
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

export const mermaidEditWidgetTheme = EditorView.theme({
  '.cm-mermaid-edit-btn': {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '1px 8px',
    fontSize: '10px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    letterSpacing: '0.3px',
    color: 'rgba(168, 85, 247, 0.9)',
    background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    verticalAlign: 'middle',
    lineHeight: '18px',
    transition: 'all 0.15s',
    '&:hover': {
      background: 'rgba(168, 85, 247, 0.2)',
      borderColor: 'rgba(168, 85, 247, 0.6)',
      color: 'rgba(168, 85, 247, 1)',
    },
  },
})
