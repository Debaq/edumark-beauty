import {
  Decoration, type DecorationSet, ViewPlugin, type ViewUpdate,
  EditorView, WidgetType,
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { imageToWebpBase64 } from '@/lib/imageToBase64'

// ── Widget ──────────────────────────────────────────────

class ImagePreviewWidget extends WidgetType {
  constructor(
    readonly dataUri: string,
    readonly sizeKB: number,
    /** Absolute range of the data URI value in the document (for replacement) */
    readonly valueFrom: number,
    readonly valueTo: number,
  ) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cm-image-preview'

    const img = document.createElement('img')
    img.src = this.dataUri
    wrap.appendChild(img)

    const badge = document.createElement('span')
    badge.className = 'cm-image-preview-size'
    badge.textContent = this.sizeKB >= 1024
      ? `${(this.sizeKB / 1024).toFixed(1)} MB`
      : `${this.sizeKB} KB`
    wrap.appendChild(badge)

    // "Cambiar" button — replace image via file picker
    const btn = document.createElement('button')
    btn.className = 'cm-image-preview-replace'
    btn.textContent = 'Cambiar'
    btn.title = 'Reemplazar imagen'
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const newUri = await imageToWebpBase64(file)
        view.dispatch({
          changes: { from: this.valueFrom, to: this.valueTo, insert: newUri },
        })
      }
      input.click()
    })
    wrap.appendChild(btn)

    return wrap
  }

  eq(other: ImagePreviewWidget): boolean {
    return this.dataUri === other.dataUri
  }

  ignoreEvent(): boolean {
    return false
  }
}

// ── Decoration builder ──────────────────────────────────

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  let inImage = false

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const trimmed = line.text.trimStart()

    // Opening :::image
    if (!inImage && /^:{3,}\s*image\b/.test(trimmed)) {
      inImage = true
      continue
    }

    // Closing :::
    if (inImage && /^:{3,}\s*$/.test(trimmed)) {
      inImage = false
      continue
    }

    if (!inImage) continue

    // Look for `file: data:image/...` line
    const fileMatch = trimmed.match(/^file:\s*(data:image\/[^\s]+)/)
    if (!fileMatch) continue

    const dataUri = fileMatch[1]
    // Calculate byte size: base64 portion after the comma
    const commaIdx = dataUri.indexOf(',')
    const base64Part = commaIdx >= 0 ? dataUri.substring(commaIdx + 1) : ''
    const sizeBytes = Math.round((base64Part.length * 3) / 4)
    const sizeKB = Math.round(sizeBytes / 1024)

    // Range of the data URI value in the document (for replacement)
    const valueStart = line.from + line.text.indexOf(dataUri)
    const valueEnd = valueStart + dataUri.length

    const deco = Decoration.replace({
      widget: new ImagePreviewWidget(dataUri, sizeKB, valueStart, valueEnd),
    })

    // Replace only the data URI part, keep `file: ` visible
    builder.add(valueStart, valueEnd, deco)
  }

  return builder.finish()
}

// ── Plugin & theme ──────────────────────────────────────

export const imagePreviewWidget = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
)

export const imagePreviewWidgetTheme = EditorView.theme({
  '.cm-image-preview': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    margin: '2px 0',
    background: 'rgba(74, 222, 128, 0.06)',
    border: '1px solid rgba(74, 222, 128, 0.2)',
    borderRadius: '6px',
    verticalAlign: 'middle',
  },
  '.cm-image-preview img': {
    maxHeight: '120px',
    maxWidth: '200px',
    borderRadius: '4px',
    objectFit: 'contain',
  },
  '.cm-image-preview-size': {
    fontSize: '10px',
    fontFamily: 'Inter, ui-monospace, monospace',
    fontWeight: '500',
    color: 'rgba(74, 222, 128, 0.8)',
    background: 'rgba(74, 222, 128, 0.1)',
    padding: '1px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  '.cm-image-preview-replace': {
    fontSize: '10px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    color: 'rgba(56, 189, 248, 0.9)',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '4px',
    padding: '1px 8px',
    cursor: 'pointer',
    lineHeight: '18px',
    transition: 'all 0.15s',
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.2)',
      borderColor: 'rgba(56, 189, 248, 0.6)',
      color: 'rgba(56, 189, 248, 1)',
    },
  },
})
