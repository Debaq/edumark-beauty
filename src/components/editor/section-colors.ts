import { EditorView, Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

/**
 * Soft background palette for sections (dark-theme friendly).
 * Each color is an rgba with very low opacity so text stays readable.
 */
const PALETTE = [
  'rgba(124, 92, 252, 0.12)',  // violet
  'rgba(92, 184, 252, 0.12)',  // blue
  'rgba(92, 252, 168, 0.12)',  // green
  'rgba(252, 212, 92, 0.12)',  // yellow
  'rgba(252, 132, 92, 0.12)',  // orange
  'rgba(252, 92, 156, 0.12)',  // pink
]

function isSeparator(line: string): boolean {
  return line.trim() === '---'
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc

  // First pass: find all separator line numbers
  const separators: number[] = []
  for (let i = 1; i <= doc.lines; i++) {
    if (isSeparator(doc.line(i).text)) {
      separators.push(i)
    }
  }

  if (separators.length < 2) return Decoration.none

  // Build sections: each section is [startLine, endLine] inclusive
  // Sections go from one separator to the next
  const sections: Array<{ from: number; to: number; color: number }> = []
  for (let i = 0; i < separators.length - 1; i++) {
    sections.push({
      from: separators[i],
      to: separators[i + 1],
      color: i % PALETTE.length,
    })
  }

  // Apply decorations line by line
  for (const section of sections) {
    const colorIdx = section.color
    const nextColorIdx = (colorIdx + 1) % PALETTE.length
    const bg = PALETTE[colorIdx]

    for (let lineNum = section.from; lineNum <= section.to; lineNum++) {
      const line = doc.line(lineNum)

      if (lineNum === section.from && section.from !== separators[0]) {
        // This --- is shared: bottom half of previous section, top half of this one
        // Already handled by the previous section's end
        continue
      }

      if (lineNum === section.to && section.to !== separators[separators.length - 1]) {
        // Shared --- : top half = current color, bottom half = next color
        const deco = Decoration.line({
          attributes: {
            style: `background: linear-gradient(to bottom, ${bg} 50%, ${PALETTE[nextColorIdx]} 50%);`,
          },
        })
        builder.add(line.from, line.from, deco)
      } else {
        // Normal line within section
        const deco = Decoration.line({
          attributes: { style: `background-color: ${bg};` },
        })
        builder.add(line.from, line.from, deco)
      }
    }
  }

  return builder.finish()
}

export const sectionColors = ViewPlugin.fromClass(
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
