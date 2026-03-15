import { Grid3X3, Move, ArrowLeftRight, X } from 'lucide-react'
import { useBookLayoutStore } from '@/store/bookLayout'
import type { BlockProps } from '@/types/bookLayout'

interface Props {
  pageIndex: number
  blockId: string
  blockProps: BlockProps | undefined
  onClose: () => void
}

export function BookBlockPanel({ pageIndex, blockId, blockProps, onClose }: Props) {
  const setBlockProps = useBookLayoutStore((s) => s.setBlockProps)
  const freeBlock = useBookLayoutStore((s) => s.freeBlock)
  const gridBlock = useBookLayoutStore((s) => s.gridBlock)

  const isFree = blockProps?.positioning === 'free'

  const handleToggleFree = () => {
    if (isFree) {
      gridBlock(pageIndex, blockId)
    } else {
      freeBlock(pageIndex, blockId, 10, 10)
    }
  }

  return (
    <div className="edm-book-block-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-[var(--app-fg)]">
          Bloque: {blockId}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--app-bg2)] text-[var(--app-fg3)]"
        >
          <X size={12} />
        </button>
      </div>

      {/* Positioning toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleToggleFree}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
            isFree
              ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
              : 'text-[var(--app-fg2)] hover:bg-[var(--app-bg2)]'
          }`}
        >
          {isFree ? (
            <>
              <Grid3X3 size={12} /> Volver a grid
            </>
          ) : (
            <>
              <Move size={12} /> Liberar posicion
            </>
          )}
        </button>
      </div>

      {/* Grid mode controls */}
      {!isFree && (
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider">
            Span
          </label>
          <div className="flex items-center gap-1">
            <ArrowLeftRight size={12} className="text-[var(--app-fg3)]" />
            <input
              type="number"
              min={1}
              max={4}
              value={blockProps?.gridSpan ?? 1}
              onChange={(e) => setBlockProps(pageIndex, blockId, { gridSpan: parseInt(e.target.value) || 1 })}
              className="w-12 px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-bg)]
                text-[var(--app-fg)] text-[11px] text-center"
            />
          </div>
        </div>
      )}

      {/* Free mode controls */}
      {isFree && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--app-fg3)] block mb-0.5">X (mm)</label>
              <input
                type="number"
                step={0.5}
                value={blockProps?.x ?? 0}
                onChange={(e) => setBlockProps(pageIndex, blockId, { x: parseFloat(e.target.value) || 0 })}
                className="w-full px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-bg)]
                  text-[var(--app-fg)] text-[11px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--app-fg3)] block mb-0.5">Y (mm)</label>
              <input
                type="number"
                step={0.5}
                value={blockProps?.y ?? 0}
                onChange={(e) => setBlockProps(pageIndex, blockId, { y: parseFloat(e.target.value) || 0 })}
                className="w-full px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-bg)]
                  text-[var(--app-fg)] text-[11px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--app-fg3)] block mb-0.5">Ancho (mm)</label>
              <input
                type="number"
                step={0.5}
                value={blockProps?.width ?? ''}
                placeholder="auto"
                onChange={(e) => setBlockProps(pageIndex, blockId, {
                  width: e.target.value ? parseFloat(e.target.value) : undefined,
                })}
                className="w-full px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-bg)]
                  text-[var(--app-fg)] text-[11px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--app-fg3)] block mb-0.5">Alto (mm)</label>
              <input
                type="number"
                step={0.5}
                value={blockProps?.height ?? ''}
                placeholder="auto"
                onChange={(e) => setBlockProps(pageIndex, blockId, {
                  height: e.target.value ? parseFloat(e.target.value) : undefined,
                })}
                className="w-full px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-bg)]
                  text-[var(--app-fg)] text-[11px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
