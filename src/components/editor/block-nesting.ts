import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

/** Colors for nesting levels 1–3, semi-transparent for subtlety. */
const NEST_COLORS = [
  'rgba(252, 176, 64, 0.55)',   // amber
  'rgba(120, 200, 255, 0.55)',  // sky
  'rgba(180, 130, 255, 0.55)',  // lavender
]

const STRIPE_W = 3   // px width of each vertical stripe
const STRIPE_GAP = 3 // px gap between stripes
const LEFT_PAD = 2   // px from the left edge to the first stripe

/**
 * Pre-build the 3 possible decorations (depth 1, 2, 3).
 * Each draws vertical stripes on the right side via background-image.
 */
const DEPTH_DECOS = [1, 2, 3].map((depth) => {
  const images: string[] = []
  const sizes: string[] = []
  const positions: string[] = []
  const repeats: string[] = []

  for (let level = 1; level <= depth; level++) {
    const color = NEST_COLORS[level - 1]
    const offset = LEFT_PAD + (level - 1) * (STRIPE_W + STRIPE_GAP)
    images.push(`linear-gradient(${color}, ${color})`)
    sizes.push(`${STRIPE_W}px 100%`)
    positions.push(`left ${offset}px center`)
    repeats.push('no-repeat')
  }

  // Text padding: clear all stripes at this depth
  const textIndent = LEFT_PAD + depth * (STRIPE_W + STRIPE_GAP) + 2

  return Decoration.line({
    attributes: {
      style: [
        `background-image: ${images.join(', ')}`,
        `background-size: ${sizes.join(', ')}`,
        `background-position: ${positions.join(', ')}`,
        `background-repeat: ${repeats.join(', ')}`,
        `padding-left: ${textIndent}px`,
      ].join('; ') + ';',
    },
  })
})

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  let depth = 0
  let inCodeFence = false

  for (let i = 1; i <= doc.lines; i++) {
    const text = doc.line(i).text.trimStart()

    if (/^```/.test(text)) {
      if (!inCodeFence) {
        // Opening code fence — new nesting level
        depth++
        inCodeFence = true
      } else {
        // Closing code fence — still belongs to current depth, then pop
        inCodeFence = false
      }
      if (depth >= 1 && depth <= 3) {
        builder.add(doc.line(i).from, doc.line(i).from, DEPTH_DECOS[depth - 1])
      }
      if (!inCodeFence) {
        if (depth > 0) depth--
      }
    } else if (!inCodeFence && /^:::\w/.test(text)) {
      // Opening block — the header line belongs to the new depth
      depth++
      if (depth >= 1 && depth <= 3) {
        builder.add(doc.line(i).from, doc.line(i).from, DEPTH_DECOS[depth - 1])
      }
    } else if (!inCodeFence && text === ':::') {
      // Closing block — the closing line still belongs to current depth
      if (depth >= 1 && depth <= 3) {
        builder.add(doc.line(i).from, doc.line(i).from, DEPTH_DECOS[depth - 1])
      }
      if (depth > 0) depth--
    } else if (depth >= 1 && depth <= 3) {
      builder.add(doc.line(i).from, doc.line(i).from, DEPTH_DECOS[depth - 1])
    }
  }

  return builder.finish()
}

export const blockNesting = ViewPlugin.fromClass(
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
