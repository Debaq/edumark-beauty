import { useMemo, useCallback } from 'react'
import {
  X, ChevronUp, ChevronDown, Columns2, Square,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react'
import { useBookLayoutStore } from '@/store/bookLayout'
import type { BlockProps, TextAlign } from '@/types/bookLayout'
import { detectBlockInfo } from './BookBlock'
import { Slider } from '@/components/ui/Slider'
import { ColorPicker } from '@/components/ui/ColorPicker'

interface Props {
  pageIndex: number
  blockId: string
  blockProps: BlockProps | undefined
  blockHtml: string
  totalPages: number
  isTwoColumns: boolean
  onClose: () => void
}

const ALIGNS: { id: TextAlign; icon: React.ReactNode; label: string }[] = [
  { id: 'left', icon: <AlignLeft size={12} />, label: 'Izquierda' },
  { id: 'center', icon: <AlignCenter size={12} />, label: 'Centro' },
  { id: 'right', icon: <AlignRight size={12} />, label: 'Derecha' },
  { id: 'justify', icon: <AlignJustify size={12} />, label: 'Justificar' },
]

export function BookBlockPanel({ pageIndex, blockId, blockProps, blockHtml, totalPages, isTwoColumns, onClose }: Props) {
  const setBlockProps = useBookLayoutStore((s) => s.setBlockProps)
  const moveBlockToPage = useBookLayoutStore((s) => s.moveBlockToPage)
  const docTextAlign = useBookLayoutStore((s) => s.layoutConfig?.textAlign)

  const info = useMemo(() => detectBlockInfo(blockHtml), [blockHtml])
  const isFullWidth = blockProps?.fullWidth ?? false
  const currentAlign = blockProps?.textAlign ?? docTextAlign ?? 'left'

  const setProp = useCallback(
    (props: Partial<BlockProps>) => setBlockProps(pageIndex, blockId, props),
    [setBlockProps, pageIndex, blockId],
  )

  const hasBorder = !!(blockProps?.borderColor && blockProps?.borderWidth)

  return (
    <div className="edm-book-block-panel">
      {/* Header: icon + type + snippet */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{info.icon}</span>
          <span className="text-[11px] font-medium text-[var(--app-fg)] truncate">
            {info.label}
          </span>
          {info.snippet && (
            <span className="text-[10px] text-[var(--app-fg3)] truncate">
              — {info.snippet}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--app-bg2)] text-[var(--app-fg3)] shrink-0 ml-1"
        >
          <X size={12} />
        </button>
      </div>

      {/* Text alignment */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Alineado
        </label>
        <div className="flex items-center gap-1">
          {ALIGNS.map(({ id, icon, label }) => {
            const isActive = currentAlign === id
            const isInherited = !blockProps?.textAlign && id === (docTextAlign ?? 'left')
            return (
              <button
                key={id}
                onClick={() => setBlockProps(pageIndex, blockId, { textAlign: id })}
                title={label}
                className={`p-1.5 rounded border transition-colors ${
                  isActive
                    ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                    : isInherited
                      ? 'border-transparent text-[var(--app-fg3)]'
                      : 'border-transparent text-[var(--app-fg3)] hover:text-[var(--app-fg2)]'
                }`}
              >
                {icon}
              </button>
            )
          })}
          {blockProps?.textAlign && (
            <button
              onClick={() => setBlockProps(pageIndex, blockId, { textAlign: undefined })}
              title="Usar alineado del documento"
              className="ml-1 px-1.5 py-0.5 rounded text-[9px] text-[var(--app-fg3)] hover:text-[var(--app-accent)] transition-colors"
            >
              Auto
            </button>
          )}
        </div>
      </div>

      {/* Column span toggle — only shown in two-columns layout */}
      {isTwoColumns && (
        <div className="mb-3">
          <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
            Columnas
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBlockProps(pageIndex, blockId, { fullWidth: false })}
              className={`flex items-center gap-1.5 px-2.5 h-7 rounded border text-[11px] font-medium transition-colors ${
                !isFullWidth
                  ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                  : 'border-[var(--app-border)] text-[var(--app-fg2)] hover:border-[var(--app-fg2)]'
              }`}
            >
              <Columns2 size={12} /> Fluir
            </button>
            <button
              onClick={() => setBlockProps(pageIndex, blockId, { fullWidth: true })}
              className={`flex items-center gap-1.5 px-2.5 h-7 rounded border text-[11px] font-medium transition-colors ${
                isFullWidth
                  ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                  : 'border-[var(--app-border)] text-[var(--app-fg2)] hover:border-[var(--app-fg2)]'
              }`}
            >
              <Square size={12} /> Ancho completo
            </button>
          </div>
        </div>
      )}

      {/* Spacing */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Espaciado
        </label>
        <Slider label="Arriba" value={blockProps?.marginTop ?? 0} min={0} max={60} step={4} unit="px" onChange={(v) => setProp({ marginTop: v || undefined })} />
        <Slider label="Abajo" value={blockProps?.marginBottom ?? 0} min={0} max={60} step={4} unit="px" onChange={(v) => setProp({ marginBottom: v || undefined })} />
      </div>

      {/* Visual styles */}
      <details className="mb-3 group">
        <summary className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider cursor-pointer select-none mb-1.5 list-none flex items-center gap-1">
          <span className="text-[8px] group-open:rotate-90 transition-transform">▶</span> Estilo
        </summary>
        <div className="mt-1.5 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <ColorPicker label="Fondo" value={blockProps?.backgroundColor ?? '#ffffff'} onChange={(v) => setProp({ backgroundColor: v })} />
            {blockProps?.backgroundColor && (
              <button
                onClick={() => setProp({ backgroundColor: undefined })}
                className="text-[9px] text-[var(--app-fg3)] hover:text-[var(--app-accent)]"
              >
                Limpiar
              </button>
            )}
          </div>
          <Slider label="Padding" value={blockProps?.padding ?? 0} min={0} max={32} step={2} unit="px" onChange={(v) => setProp({ padding: v || undefined })} />
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={hasBorder}
              onChange={(e) => {
                if (e.target.checked) {
                  setProp({ borderColor: '#e0e0e0', borderWidth: 1, borderRadius: blockProps?.borderRadius ?? 4 })
                } else {
                  setProp({ borderColor: undefined, borderWidth: undefined, borderRadius: undefined })
                }
              }}
              className="accent-[var(--app-accent)]"
            />
            <span className="text-xs text-[var(--app-fg2)]">Borde</span>
          </label>
          {hasBorder && (
            <div className="pl-2 flex flex-col gap-0.5">
              <ColorPicker label="Color" value={blockProps?.borderColor ?? '#e0e0e0'} onChange={(v) => setProp({ borderColor: v })} />
              <Slider label="Grosor" value={blockProps?.borderWidth ?? 1} min={1} max={4} step={1} unit="px" onChange={(v) => setProp({ borderWidth: v })} />
              <Slider label="Radio" value={blockProps?.borderRadius ?? 0} min={0} max={16} step={2} unit="px" onChange={(v) => setProp({ borderRadius: v || undefined })} />
            </div>
          )}
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={blockProps?.shadow ?? false}
              onChange={(e) => setProp({ shadow: e.target.checked || undefined })}
              className="accent-[var(--app-accent)]"
            />
            <span className="text-xs text-[var(--app-fg2)]">Sombra</span>
          </label>
        </div>
      </details>

      {/* Move to page buttons */}
      <div>
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Mover a página
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => moveBlockToPage(blockId, pageIndex - 1, 'end')}
            disabled={pageIndex <= 0}
            className={`flex items-center gap-1 px-2 h-7 rounded border text-[11px] transition-colors
              border-[var(--app-border)] text-[var(--app-fg2)] hover:border-[var(--app-fg2)]
              ${pageIndex <= 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <ChevronUp size={12} /> Anterior
          </button>
          <button
            onClick={() => moveBlockToPage(blockId, pageIndex + 1, 'start')}
            disabled={pageIndex >= totalPages - 1}
            className={`flex items-center gap-1 px-2 h-7 rounded border text-[11px] transition-colors
              border-[var(--app-border)] text-[var(--app-fg2)] hover:border-[var(--app-fg2)]
              ${pageIndex >= totalPages - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Siguiente <ChevronDown size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
