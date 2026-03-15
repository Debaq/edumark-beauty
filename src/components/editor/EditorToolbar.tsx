import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { EditorView } from '@codemirror/view'
import {
  Bold, Italic, Strikethrough, Code, Braces,
  List, ListOrdered, ListChecks, Quote,
  Link2, Image, Table, Minus, ChevronDown,
  Palette, Type, Superscript, Subscript,
  Smile, LayoutGrid,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  wrapSelection, insertAtLineStart, setHeading, insertBlockText,
  insertEdmBlock, insertText, generateTable,
} from './editor-commands'

// ── Constants ────────────────────────────────────────────

const HEADING_LEVELS = [
  { level: 1, label: 'Titulo 1', size: '1.25em', weight: 700 },
  { level: 2, label: 'Titulo 2', size: '1.15em', weight: 700 },
  { level: 3, label: 'Titulo 3', size: '1.05em', weight: 600 },
  { level: 4, label: 'Titulo 4', size: '1em', weight: 600 },
  { level: 5, label: 'Titulo 5', size: '0.95em', weight: 600 },
  { level: 6, label: 'Titulo 6', size: '0.9em', weight: 600 },
]

const TEXT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
]

const BG_COLORS = [
  '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc',
  '#bfdbfe', '#ddd6fe', '#fbcfe8', '#fecdd3', '#99f6e4',
]

const EDUMARK_BLOCKS = [
  {
    category: 'Estructura', items: [
      { type: 'objective', label: 'Objetivo', color: '#fcd34d', content: 'Objetivo aqui' },
      { type: 'definition', label: 'Definicion', color: '#60a5fa', content: 'Definicion aqui' },
      { type: 'key-concept', label: 'Concepto clave', color: '#f472b6', content: 'Concepto aqui' },
      { type: 'summary', label: 'Resumen', color: '#818cf8', content: 'Resumen aqui' },
    ],
  },
  {
    category: 'Contenido', items: [
      { type: 'note', label: 'Nota', color: '#a3e635', content: 'Nota aqui' },
      { type: 'example', label: 'Ejemplo', color: '#34d399', content: 'Ejemplo aqui' },
      { type: 'exercise', label: 'Ejercicio', color: '#fb923c', content: 'Ejercicio aqui' },
      { type: 'application', label: 'Aplicacion', color: '#2dd4bf', content: 'Aplicacion aqui' },
    ],
  },
  {
    category: 'Alerta', items: [
      { type: 'warning', label: 'Advertencia', color: '#f87171', content: 'Advertencia aqui' },
      { type: 'aside', label: 'Nota al margen', color: '#a78bfa', content: 'Nota al margen aqui' },
    ],
  },
  {
    category: 'Visual', items: [
      { type: 'diagram', label: 'Diagrama', color: '#38bdf8', content: 'Descripcion del diagrama' },
      { type: 'image', label: 'Imagen', color: '#4ade80', content: 'src: url\nalt: Descripcion' },
      { type: 'comparison', label: 'Comparacion', color: '#c084fc', content: 'Comparacion aqui' },
    ],
  },
  {
    category: 'Especial', items: [
      { type: 'question', label: 'Pregunta', color: '#facc15', content: '¿Pregunta aqui?\n- [ ] Opcion A\n- [x] Opcion B (correcta)\n- [ ] Opcion C' },
      { type: 'mnemonic', label: 'Mnemotecnia', color: '#e879f9', content: 'Regla mnemotecnica aqui' },
      { type: 'history', label: 'Historia', color: '#d97757', content: 'Contexto historico aqui' },
      { type: 'reference', label: 'Referencia', color: '#94a3b8', content: 'title: Titulo\nurl: url' },
      { type: 'math', label: 'Matematica', color: '#5eead4', content: '$$\nx^2 + y^2 = z^2\n$$' },
    ],
  },
]

const SYMBOLS = [
  { category: 'Flechas', items: ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇔'] },
  { category: 'Matematica', items: ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '√', '∑', '∫', 'π'] },
  { category: 'Griego', items: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'σ', 'φ', 'ω', 'Ω'] },
  { category: 'Marcas', items: ['✓', '✗', '★', '•', '●', '○', '◆', '▸', '■', '□'] },
  { category: 'Misc', items: ['©', '®', '™', '°', '§', '…', '—', '«', '»', '¿', '¡', '€'] },
]

// ── Sub-components ───────────────────────────────────────

function ToolbarBtn({
  icon: Icon,
  title,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ size?: number }>
  title: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]'
          : 'text-[var(--app-fg2)] hover:text-[var(--app-fg)] hover:bg-[var(--app-bg2)]',
      )}
    >
      <Icon size={15} />
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-[var(--app-border)] mx-0.5 shrink-0" />
}

/** Floating popup rendered in a portal to escape overflow clipping */
function FloatingPopup({
  anchorRef,
  open,
  children,
  className,
  alignRight,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  children: React.ReactNode
  className?: string
  alignRight?: boolean
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 4,
      left: alignRight ? rect.right : rect.left,
    })
  }, [open, anchorRef, alignRight])

  if (!open) return null

  return createPortal(
    <div
      className={clsx(
        'fixed z-[9999] bg-[var(--app-bg1)] border border-[var(--app-border)]',
        'rounded-lg shadow-xl shadow-black/40 animate-in',
        className,
      )}
      style={{
        top: pos.top,
        ...(alignRight ? { right: window.innerWidth - pos.left } : { left: pos.left }),
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

// ── Main component ───────────────────────────────────────

interface EditorToolbarProps {
  getView: () => EditorView | null
}

export function EditorToolbar({ getView }: EditorToolbarProps) {
  const [activePopup, setActivePopup] = useState<string | null>(null)
  const [tableHover, setTableHover] = useState<[number, number]>([0, 0])
  const [customColor, setCustomColor] = useState('#ef4444')
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Refs for popup anchors
  const headingRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const edumarkRef = useRef<HTMLDivElement>(null)
  const symbolsRef = useRef<HTMLDivElement>(null)

  const toggle = (name: string) => setActivePopup((p) => (p === name ? null : name))
  const close = () => setActivePopup(null)

  // Close on click outside
  useEffect(() => {
    if (!activePopup) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      // Check if click is inside the toolbar
      if (toolbarRef.current?.contains(target)) return
      // Check if click is inside any floating popup (portal)
      const popups = document.querySelectorAll('[data-editor-popup]')
      for (const popup of popups) {
        if (popup.contains(target)) return
      }
      close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activePopup])

  // Close on Escape
  useEffect(() => {
    if (!activePopup) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [activePopup])

  // Action helpers
  const wrap = (before: string, after: string, ph?: string) => {
    const view = getView()
    if (view) wrapSelection(view, before, after, ph)
  }

  const linePrefix = (prefix: string) => {
    const view = getView()
    if (view) insertAtLineStart(view, prefix)
  }

  const heading = (level: number) => {
    const view = getView()
    if (view) setHeading(view, level)
    close()
  }

  const block = (text: string) => {
    const view = getView()
    if (view) insertBlockText(view, text)
  }

  const edmBlock = (type: string, content: string) => {
    const view = getView()
    if (view) insertEdmBlock(view, type, content)
    close()
  }

  const insert = (text: string) => {
    const view = getView()
    if (view) insertText(view, text)
  }

  return (
    <div
      ref={toolbarRef}
      className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-[var(--app-bg1)]
        border-b border-[var(--app-border)] shrink-0"
    >
      {/* ── Inline formatting ── */}
      <ToolbarBtn icon={Bold} title="Negrita (Ctrl+B)" onClick={() => wrap('**', '**')} />
      <ToolbarBtn icon={Italic} title="Cursiva (Ctrl+I)" onClick={() => wrap('*', '*')} />
      <ToolbarBtn icon={Strikethrough} title="Tachado (Ctrl+Shift+X)" onClick={() => wrap('~~', '~~')} />
      <ToolbarBtn icon={Code} title="Codigo inline (Ctrl+E)" onClick={() => wrap('`', '`', 'codigo')} />
      <ToolbarBtn icon={Superscript} title="Superindice" onClick={() => wrap('<sup>', '</sup>')} />
      <ToolbarBtn icon={Subscript} title="Subindice" onClick={() => wrap('<sub>', '</sub>')} />

      {/* Color picker */}
      <div ref={colorRef}>
        <ToolbarBtn
          icon={Palette}
          title="Color de texto"
          onClick={() => toggle('color')}
          active={activePopup === 'color'}
        />
      </div>

      <Sep />

      {/* ── Headings ── */}
      <div ref={headingRef}>
        <button
          onClick={() => toggle('heading')}
          title="Encabezados"
          className={clsx(
            'flex items-center gap-0.5 px-1.5 py-1 rounded text-xs font-medium transition-colors',
            activePopup === 'heading'
              ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]'
              : 'text-[var(--app-fg2)] hover:text-[var(--app-fg)] hover:bg-[var(--app-bg2)]',
          )}
        >
          <Type size={15} />
          <ChevronDown size={10} />
        </button>
      </div>

      <Sep />

      {/* ── Block formatting ── */}
      <ToolbarBtn icon={Quote} title="Cita" onClick={() => linePrefix('> ')} />
      <ToolbarBtn icon={List} title="Lista" onClick={() => linePrefix('- ')} />
      <ToolbarBtn icon={ListOrdered} title="Lista numerada" onClick={() => linePrefix('1. ')} />
      <ToolbarBtn icon={ListChecks} title="Lista de tareas" onClick={() => linePrefix('- [ ] ')} />
      <ToolbarBtn icon={Braces} title="Bloque de codigo" onClick={() => block('```\n\n```')} />

      <Sep />

      {/* ── Insert ── */}
      <ToolbarBtn icon={Link2} title="Enlace (Ctrl+K)" onClick={() => wrap('[', '](url)', 'texto')} />
      <ToolbarBtn icon={Image} title="Imagen" onClick={() => insert('![alt](url)')} />
      <ToolbarBtn icon={Minus} title="Linea horizontal / separador" onClick={() => block('---')} />

      {/* Table picker */}
      <div ref={tableRef}>
        <ToolbarBtn
          icon={Table}
          title="Insertar tabla"
          onClick={() => toggle('table')}
          active={activePopup === 'table'}
        />
      </div>

      <Sep />

      {/* ── Edumark blocks ── */}
      <div ref={edumarkRef}>
        <button
          onClick={() => toggle('edumark')}
          title="Bloques Edumark"
          className={clsx(
            'flex items-center gap-1 px-1.5 py-1 rounded text-xs font-medium transition-colors',
            activePopup === 'edumark'
              ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]'
              : 'text-[var(--app-fg2)] hover:text-[var(--app-fg)] hover:bg-[var(--app-bg2)]',
          )}
        >
          <LayoutGrid size={15} />
          <span className="hidden lg:inline">Edumark</span>
          <ChevronDown size={10} />
        </button>
      </div>

      <Sep />

      {/* ── Symbols ── */}
      <div ref={symbolsRef}>
        <ToolbarBtn
          icon={Smile}
          title="Simbolos y caracteres"
          onClick={() => toggle('symbols')}
          active={activePopup === 'symbols'}
        />
      </div>

      {/* ═══════ Floating popups (portals) ═══════ */}

      {/* Heading picker */}
      <FloatingPopup anchorRef={headingRef} open={activePopup === 'heading'}>
        <div data-editor-popup className="py-1 w-44">
          {HEADING_LEVELS.map(({ level, label, size, weight }) => (
            <button
              key={level}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left
                text-[var(--app-fg1)] hover:bg-[var(--app-bg2)] transition-colors"
              onClick={() => heading(level)}
            >
              <span className="text-[var(--app-fg3)] font-mono text-xs w-6">H{level}</span>
              <span style={{ fontSize: size, fontWeight: weight }}>{label}</span>
            </button>
          ))}
        </div>
      </FloatingPopup>

      {/* Color picker */}
      <FloatingPopup anchorRef={colorRef} open={activePopup === 'color'}>
        <div data-editor-popup className="p-3 w-48">
          <p className="text-[10px] uppercase tracking-wider text-[var(--app-fg3)] mb-1.5 font-medium">
            Color de texto
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded-full border border-[var(--app-border)]
                  hover:scale-110 transition-transform"
                style={{ background: c }}
                title={c}
                onClick={() => {
                  wrap(`<span style="color:${c}">`, '</span>')
                  close()
                }}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--app-fg3)] mb-1.5 font-medium">
            Resaltado
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {BG_COLORS.map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded-full border border-[var(--app-border)]
                  hover:scale-110 transition-transform"
                style={{ background: c }}
                title={c}
                onClick={() => {
                  wrap(`<mark style="background:${c}">`, '</mark>')
                  close()
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--app-border)]">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <span className="text-xs text-[var(--app-fg2)] flex-1 font-mono">{customColor}</span>
            <button
              className="text-[10px] px-2 py-1 rounded bg-[var(--app-accent)]/20 text-[var(--app-accent)]
                hover:bg-[var(--app-accent)]/30 transition-colors font-medium"
              onClick={() => {
                wrap(`<span style="color:${customColor}">`, '</span>')
                close()
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </FloatingPopup>

      {/* Table picker */}
      <FloatingPopup anchorRef={tableRef} open={activePopup === 'table'}>
        <div data-editor-popup className="p-3">
          <p className="text-xs text-center text-[var(--app-fg2)] mb-2 font-medium">
            {tableHover[0] > 0
              ? `${tableHover[1]} × ${tableHover[0]}`
              : 'Selecciona tamaño'}
          </p>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}
            onMouseLeave={() => setTableHover([0, 0])}
          >
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 8 }, (_, col) => (
                <button
                  key={`${row}-${col}`}
                  className={clsx(
                    'w-5 h-5 rounded-sm border transition-all',
                    row < tableHover[0] && col < tableHover[1]
                      ? 'bg-[var(--app-accent)]/30 border-[var(--app-accent)]/50'
                      : 'bg-[var(--app-bg2)] border-[var(--app-border)] hover:border-[var(--app-fg3)]',
                  )}
                  onMouseEnter={() => setTableHover([row + 1, col + 1])}
                  onClick={() => {
                    block(generateTable(row + 2, col + 1))
                    close()
                  }}
                />
              )),
            )}
          </div>
        </div>
      </FloatingPopup>

      {/* Edumark blocks */}
      <FloatingPopup anchorRef={edumarkRef} open={activePopup === 'edumark'}>
        <div data-editor-popup className="py-1 w-56 max-h-80 overflow-y-auto">
          {EDUMARK_BLOCKS.map(({ category, items }) => (
            <div key={category}>
              <p className="text-[10px] uppercase tracking-wider text-[var(--app-fg3)] px-3 pt-2 pb-1 font-medium">
                {category}
              </p>
              {items.map(({ type, label, color, content }) => (
                <button
                  key={type}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm
                    text-[var(--app-fg1)] hover:bg-[var(--app-bg2)] transition-colors"
                  onClick={() => edmBlock(type, content)}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span>{label}</span>
                  <span className="ml-auto text-[10px] text-[var(--app-fg3)] font-mono">
                    :::{type}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </FloatingPopup>

      {/* Symbols */}
      <FloatingPopup anchorRef={symbolsRef} open={activePopup === 'symbols'} alignRight>
        <div data-editor-popup className="p-3 w-64 max-h-72 overflow-y-auto">
          {SYMBOLS.map(({ category, items }) => (
            <div key={category} className="mb-2 last:mb-0">
              <p className="text-[10px] uppercase tracking-wider text-[var(--app-fg3)] mb-1 font-medium">
                {category}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {items.map((s) => (
                  <button
                    key={s}
                    className="w-7 h-7 flex items-center justify-center rounded text-sm
                      text-[var(--app-fg1)] hover:bg-[var(--app-accent)]/20 hover:text-[var(--app-accent)]
                      transition-colors"
                    title={s}
                    onClick={() => {
                      insert(s)
                      close()
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FloatingPopup>
    </div>
  )
}
