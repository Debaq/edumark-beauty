import { useMemo } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { useBookLayoutStore } from '@/store/bookLayout'
import type { BlockProps } from '@/types/bookLayout'
import { detectBlockInfo } from './BookBlock'

interface Props {
  pageIndex: number
  blockId: string
  blockProps: BlockProps | undefined
  blockHtml: string
  totalPages: number
  onClose: () => void
}

export function BookBlockPanel({ pageIndex, blockId, blockProps, blockHtml, totalPages, onClose }: Props) {
  const setBlockProps = useBookLayoutStore((s) => s.setBlockProps)
  const moveBlockToPage = useBookLayoutStore((s) => s.moveBlockToPage)

  const info = useMemo(() => detectBlockInfo(blockHtml), [blockHtml])
  const currentSpan = blockProps?.gridSpan ?? 1

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

      {/* Grid span: visual buttons */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Columnas
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setBlockProps(pageIndex, blockId, { gridSpan: n })}
              className={`w-8 h-7 rounded border text-[11px] font-medium transition-colors ${
                currentSpan === n
                  ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                  : 'border-[var(--app-border)] text-[var(--app-fg2)] hover:border-[var(--app-fg2)]'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setBlockProps(pageIndex, blockId, { gridSpan: 99 })}
            className={`px-2 h-7 rounded border text-[11px] font-medium transition-colors ${
              currentSpan >= 99
                ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                : 'border-[var(--app-border)] text-[var(--app-fg2)] hover:border-[var(--app-fg2)]'
            }`}
          >
            Full
          </button>
        </div>
      </div>

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
