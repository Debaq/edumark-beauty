import { syntaxTree } from '@codemirror/language'
import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

/** Mark decoration factory. */
function mk(style: string) {
  return Decoration.mark({ attributes: { style } })
}

/* ── colour palette (One Dark inspired, high contrast on dark bg) ── */

const decos = {
  h1:     mk('color: #ef6b73; font-weight: bold;'),
  h2:     mk('color: #61afef; font-weight: bold;'),
  h3:     mk('color: #c678dd; font-weight: bold;'),
  h4:     mk('color: #d19a66; font-weight: bold;'),
  h5:     mk('color: #56b6c2; font-weight: bold;'),
  h6:     mk('color: #be5046; font-weight: bold;'),
  bold:   mk('color: #e5c07b; font-weight: bold;'),
  italic: mk('color: #c678dd; font-style: italic;'),
  strike: mk('color: #5c6370; text-decoration: line-through;'),
  link:   mk('color: #61afef;'),
  url:    mk('color: #5c6370;'),
  code:   mk('color: #e06c75; background: rgba(224,108,117,0.08); border-radius: 3px; padding: 0 2px;'),
  quote:  mk('color: #98c379; font-style: italic;'),
  list:   mk('color: #d19a66; font-weight: bold;'),
  image:  mk('color: #98c379;'),
  mark:   mk('color: #5c6370;'),  // syntax markers (#, **, *, [, ], etc.)
  hr:     mk('color: #5c6370;'),
  table:  mk('color: #5c6370;'),
}

const HEADING: Record<string, Decoration> = {
  ATXHeading1:    decos.h1,
  ATXHeading2:    decos.h2,
  ATXHeading3:    decos.h3,
  ATXHeading4:    decos.h4,
  ATXHeading5:    decos.h5,
  ATXHeading6:    decos.h6,
  SetextHeading1: decos.h1,
  SetextHeading2: decos.h2,
}

function buildDecorations(view: EditorView): DecorationSet {
  const ranges: { from: number; to: number; deco: Decoration }[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter(node) {
        const n = node.name
        const f = node.from
        const t = node.to

        // Headings (full line)
        if (n in HEADING) {
          ranges.push({ from: f, to: t, deco: HEADING[n] })
          return
        }
        // Header mark chars (#)
        if (n === 'HeaderMark') {
          ranges.push({ from: f, to: t, deco: decos.mark })
          return
        }

        // Bold
        if (n === 'StrongEmphasis') {
          ranges.push({ from: f, to: t, deco: decos.bold })
          return
        }
        // Italic
        if (n === 'Emphasis') {
          ranges.push({ from: f, to: t, deco: decos.italic })
          return
        }
        // Emphasis markers (*, _, **, __)
        if (n === 'EmphasisMark') {
          ranges.push({ from: f, to: t, deco: decos.mark })
          return
        }

        // Links
        if (n === 'Link') {
          ranges.push({ from: f, to: t, deco: decos.link })
          return
        }
        if (n === 'URL') {
          ranges.push({ from: f, to: t, deco: decos.url })
          return
        }
        if (n === 'LinkMark') {
          ranges.push({ from: f, to: t, deco: decos.mark })
          return
        }

        // Inline code
        if (n === 'InlineCode') {
          ranges.push({ from: f, to: t, deco: decos.code })
          return
        }
        if (n === 'CodeMark') {
          ranges.push({ from: f, to: t, deco: decos.mark })
          return
        }

        // Blockquote content
        if (n === 'Blockquote') {
          ranges.push({ from: f, to: t, deco: decos.quote })
          return
        }
        if (n === 'QuoteMark') {
          ranges.push({ from: f, to: t, deco: decos.mark })
          return
        }

        // List markers (-, *, +, 1.)
        if (n === 'ListMark') {
          ranges.push({ from: f, to: t, deco: decos.list })
          return
        }

        // Strikethrough (GFM)
        if (n === 'Strikethrough') {
          ranges.push({ from: f, to: t, deco: decos.strike })
          return
        }
        if (n === 'StrikethroughMark') {
          ranges.push({ from: f, to: t, deco: decos.mark })
          return
        }

        // Images
        if (n === 'Image') {
          ranges.push({ from: f, to: t, deco: decos.image })
          return
        }

        // Horizontal rule
        if (n === 'HorizontalRule') {
          ranges.push({ from: f, to: t, deco: decos.hr })
          return
        }

        // Table delimiters
        if (n === 'TableDelimiter') {
          ranges.push({ from: f, to: t, deco: decos.table })
          return
        }
      }
    })
  }

  // Sort by position (iterate is pre-order so mostly sorted, but ensure)
  ranges.sort((a, b) => a.from - b.from || a.to - b.to)

  const builder = new RangeSetBuilder<Decoration>()
  for (const r of ranges) {
    if (r.from < r.to) builder.add(r.from, r.to, r.deco)
  }
  return builder.finish()
}

export const markdownHighlight = ViewPlugin.fromClass(
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
  { decorations: (v) => v.decorations }
)
