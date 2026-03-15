import { foldGutter, foldService, foldEffect, foldKeymap } from '@codemirror/language'
import { EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view'
import { type Extension, type StateEffect } from '@codemirror/state'

/**
 * Fold service: multi-line HTML comments (<!-- … -->) are foldable.
 * The first line stays visible; everything from end-of-first-line to
 * end-of-closing `-->` line is the fold range.
 */
const commentFoldService = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart)
  const trimmed = line.text.trimStart()

  if (!trimmed.startsWith('<!--')) return null
  // Single-line comment — nothing to fold
  if (trimmed.includes('-->')) return null

  for (let i = line.number + 1; i <= state.doc.lines; i++) {
    const next = state.doc.line(i)
    if (next.text.includes('-->')) {
      return { from: line.to, to: next.to }
    }
  }
  return null
})

/**
 * Auto-fold every HTML comment on mount and whenever the entire
 * document is replaced (e.g. loading a new file).
 */
const autoFold = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      // Wait one frame so the editor is fully laid out
      requestAnimationFrame(() => this.foldComments(view))
    }

    update(update: ViewUpdate) {
      if (!update.docChanged) return

      // Detect full-document replacement (external source change)
      let fullReplace = false
      update.changes.iterChanges((fromA, toA) => {
        if (fromA === 0 && toA === update.startState.doc.length) fullReplace = true
      })

      if (fullReplace) {
        requestAnimationFrame(() => this.foldComments(update.view))
      }
    }

    foldComments(view: EditorView) {
      const effects: StateEffect<{ from: number; to: number }>[] = []
      const doc = view.state.doc

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)
        const trimmed = line.text.trimStart()
        if (!trimmed.startsWith('<!--') || trimmed.includes('-->')) continue

        for (let j = i + 1; j <= doc.lines; j++) {
          const next = doc.line(j)
          if (next.text.includes('-->')) {
            effects.push(foldEffect.of({ from: line.to, to: next.to }))
            i = j
            break
          }
        }
      }

      if (effects.length) view.dispatch({ effects })
    }
  }
)

/** Theme for fold gutter markers and fold placeholder widget. */
const foldTheme = EditorView.theme({
  '.cm-foldGutter .cm-gutterElement': {
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.2)',
    transition: 'color 0.15s',
    padding: '0 3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.cm-foldGutter .cm-gutterElement:hover': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '.cm-foldPlaceholder': {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '3px',
    color: 'rgba(255, 255, 255, 0.35)',
    padding: '0 6px',
    margin: '0 4px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85em',
  },
})

export const commentFold: Extension = [
  commentFoldService,
  foldGutter({
    openText: '\u25BE',   // ▾
    closedText: '\u25B8', // ▸
  }),
  keymap.of(foldKeymap),
  autoFold,
  foldTheme,
]
