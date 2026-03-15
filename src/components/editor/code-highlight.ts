import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

/** Text color per block type for syntax lines. */
const BLOCK_COLORS: Record<string, string> = {
  objective:    'rgba(252, 211, 77,  0.85)',  // amber
  definition:   'rgba(96,  165, 250, 0.85)',  // blue
  'key-concept':'rgba(244, 114, 182, 0.85)',  // pink
  note:         'rgba(163, 230, 53,  0.85)',  // lime
  warning:      'rgba(248, 113, 113, 0.85)',  // red
  example:      'rgba(52,  211, 153, 0.85)',  // emerald
  exercise:     'rgba(251, 146, 60,  0.85)',  // orange
  application:  'rgba(45,  212, 191, 0.85)',  // teal
  comparison:   'rgba(192, 132, 252, 0.85)',  // purple
  diagram:      'rgba(56,  189, 248, 0.85)',  // sky
  image:        'rgba(74,  222, 128, 0.85)',  // green
  question:     'rgba(250, 204, 21,  0.85)',  // yellow
  mnemonic:     'rgba(232, 121, 249, 0.85)',  // fuchsia
  history:      'rgba(217, 119, 87,  0.85)',  // brown/sienna
  summary:      'rgba(129, 140, 248, 0.85)',  // indigo
  reference:    'rgba(148, 163, 184, 0.85)',  // slate
  aside:        'rgba(167, 139, 250, 0.85)',  // violet
  math:         'rgba(94,  234, 212, 0.85)',  // cyan
}

/** Blocks whose content lines are key:value attributes (not rendered text). */
const ATTR_BLOCKS = new Set(['image', 'reference'])

const CODE_COLOR = 'rgba(180, 180, 180, 0.6)'

const codeDeco = Decoration.line({
  attributes: { style: `color: ${CODE_COLOR};` },
})

const sepDeco = Decoration.line({
  attributes: { style: `color: ${CODE_COLOR};` },
})

/** Cache decorations per block type. */
const blockDecos: Record<string, Decoration> = {}
for (const [type, color] of Object.entries(BLOCK_COLORS)) {
  blockDecos[type] = Decoration.line({
    attributes: { style: `color: ${color};` },
  })
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  let inCode = false
  const blockStack: string[] = []

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const trimmed = line.text.trimStart()

    // Code fences (``` lines and their content)
    if (/^```/.test(trimmed)) {
      builder.add(line.from, line.from, codeDeco)
      inCode = !inCode
      continue
    }
    if (inCode) {
      builder.add(line.from, line.from, codeDeco)
      continue
    }

    // Section separator ---
    if (trimmed === '---') {
      builder.add(line.from, line.from, sepDeco)
      continue
    }

    // Opening block: :::type — this is syntax
    const openMatch = trimmed.match(/^:::(\w[\w-]*)/)
    if (openMatch) {
      const type = openMatch[1]
      blockStack.push(type)
      const deco = blockDecos[type] ?? codeDeco
      builder.add(line.from, line.from, deco)
      continue
    }

    // Closing block: ::: — this is syntax
    if (trimmed === ':::') {
      const type = blockStack.pop()
      if (type) {
        const deco = blockDecos[type] ?? codeDeco
        builder.add(line.from, line.from, deco)
      } else {
        builder.add(line.from, line.from, codeDeco)
      }
      continue
    }

    // Inside attribute-only blocks, all lines are syntax (key: value)
    if (blockStack.length > 0) {
      const currentType = blockStack[blockStack.length - 1]
      if (ATTR_BLOCKS.has(currentType) && /^\w[\w-]*\s*:/.test(trimmed)) {
        const deco = blockDecos[currentType] ?? codeDeco
        builder.add(line.from, line.from, deco)
      }
    }
  }

  return builder.finish()
}

export const codeHighlight = ViewPlugin.fromClass(
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
