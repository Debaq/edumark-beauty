import { keymap, type EditorView } from '@codemirror/view'

export function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholder = 'texto',
) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const text = selected || placeholder
  view.dispatch({
    changes: { from, to, insert: `${before}${text}${after}` },
    selection: {
      anchor: from + before.length,
      head: from + before.length + text.length,
    },
  })
  view.focus()
}

export function insertAtLineStart(view: EditorView, prefix: string) {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
  })
  view.focus()
}

export function setHeading(view: EditorView, level: number) {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const match = line.text.match(/^(#{1,6})\s/)
  const prefix = '#'.repeat(level) + ' '
  if (match) {
    view.dispatch({
      changes: { from: line.from, to: line.from + match[0].length, insert: prefix },
    })
  } else {
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
    })
  }
  view.focus()
}

export function insertBlockText(view: EditorView, blockText: string) {
  const { from, to } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const isEmptyLine = line.text.trim() === '' && from === line.from
  const prefix = isEmptyLine ? '' : '\n\n'
  const full = `${prefix}${blockText}\n`
  view.dispatch({
    changes: { from, to, insert: full },
  })
  view.focus()
}

export function insertEdmBlock(
  view: EditorView,
  type: string,
  defaultContent: string,
) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const content = selected || defaultContent
  const line = view.state.doc.lineAt(from)
  const isEmptyLine = line.text.trim() === '' && from === line.from
  const prefix = isEmptyLine ? '' : '\n\n'
  const opening = `:::${type}`
  const block = `${prefix}${opening}\n${content}\n:::\n`
  const contentStart = from + prefix.length + opening.length + 1
  const contentEnd = contentStart + content.length
  view.dispatch({
    changes: { from, to, insert: block },
    selection: { anchor: contentStart, head: contentEnd },
  })
  view.focus()
}

export function insertText(view: EditorView, text: string) {
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  view.focus()
}

export function generateTable(rows: number, cols: number): string {
  const header =
    '| ' +
    Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(' | ') +
    ' |'
  const separator =
    '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |'
  const row =
    '| ' + Array.from({ length: cols }, () => '   ').join(' | ') + ' |'
  const bodyRows = Array.from({ length: rows - 1 }, () => row).join('\n')
  return `${header}\n${separator}${bodyRows ? '\n' + bodyRows : ''}`
}

export const formattingKeymap = keymap.of([
  {
    key: 'Mod-b',
    run: (view) => {
      wrapSelection(view, '**', '**')
      return true
    },
  },
  {
    key: 'Mod-i',
    run: (view) => {
      wrapSelection(view, '*', '*')
      return true
    },
  },
  {
    key: 'Mod-Shift-x',
    run: (view) => {
      wrapSelection(view, '~~', '~~')
      return true
    },
  },
  {
    key: 'Mod-e',
    run: (view) => {
      wrapSelection(view, '`', '`', 'codigo')
      return true
    },
  },
  {
    key: 'Mod-k',
    run: (view) => {
      wrapSelection(view, '[', '](url)', 'texto')
      return true
    },
  },
])
