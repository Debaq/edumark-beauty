import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

/**
 * Auto-aligns markdown table pipes as the user types.
 * Reformats after a short pause to avoid fighting with keystrokes.
 */

function parseCells(line: string): string[] | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null
  // Split inner content by |, trim each cell
  const inner = trimmed.slice(1, -1)
  return inner.split('|').map((c) => c.trim())
}

function isSepCell(cell: string): boolean {
  return /^:?-+:?$/.test(cell)
}

function formatTable(lines: string[]): string[] | null {
  const rows = lines.map(parseCells)
  // All lines must be valid table rows
  if (rows.some((r) => r === null)) return null
  const parsed = rows as string[][]
  if (parsed.length < 2) return null

  const maxCols = Math.max(...parsed.map((r) => r.length))
  if (maxCols === 0) return null

  // Compute max width per column
  const widths = new Array<number>(maxCols).fill(1)
  for (const row of parsed) {
    for (let c = 0; c < row.length; c++) {
      const w = isSepCell(row[c]) ? 3 : row[c].length
      if (w > widths[c]) widths[c] = w
    }
  }

  // Rebuild each line
  return parsed.map((row) => {
    const cells: string[] = []
    for (let c = 0; c < maxCols; c++) {
      const cell = row[c] ?? ''
      if (isSepCell(cell)) {
        const left = cell.startsWith(':')
        const right = cell.endsWith(':')
        const dashes = widths[c] - (left ? 1 : 0) - (right ? 1 : 0)
        cells.push((left ? ':' : '') + '-'.repeat(dashes) + (right ? ':' : ''))
      } else {
        cells.push(cell.padEnd(widths[c]))
      }
    }
    return '| ' + cells.join(' | ') + ' |'
  })
}

function buildChanges(view: EditorView) {
  const doc = view.state.doc
  const changes: Array<{ from: number; to: number; insert: string }> = []

  let i = 1
  let inCode = false

  while (i <= doc.lines) {
    const text = doc.line(i).text
    if (/^\s*```/.test(text)) {
      inCode = !inCode
      i++
      continue
    }
    if (inCode) { i++; continue }

    if (parseCells(text) !== null) {
      const startLine = i
      const tableLines: string[] = []
      while (i <= doc.lines && parseCells(doc.line(i).text) !== null) {
        tableLines.push(doc.line(i).text)
        i++
      }
      const endLine = i - 1

      const formatted = formatTable(tableLines)
      if (formatted) {
        const oldText = tableLines.join('\n')
        const newText = formatted.join('\n')
        if (oldText !== newText) {
          changes.push({
            from: doc.line(startLine).from,
            to: doc.line(endLine).to,
            insert: newText,
          })
        }
      }
    } else {
      i++
    }
  }

  return changes
}

export const tableFormatter = ViewPlugin.fromClass(
  class {
    private timer: ReturnType<typeof setTimeout> | null = null

    constructor(private view: EditorView) {
      this.schedule()
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.schedule()
      }
    }

    schedule() {
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => this.format(), 800)
    }

    format() {
      const changes = buildChanges(this.view)
      if (changes.length > 0) {
        this.view.dispatch({ changes })
      }
    }

    destroy() {
      if (this.timer) clearTimeout(this.timer)
    }
  }
)
