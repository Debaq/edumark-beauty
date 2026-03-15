import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify, X,
} from 'lucide-react'
import { useContentModeStore } from '@/store/contentMode'
import { useBookLayoutStore } from '@/store/bookLayout'
import { PAPER_SIZES, type PageConfig } from '@/types/contentMode'
import type { TextAlign } from '@/types/bookLayout'

interface Props {
  onClose: () => void
}

const ALIGNS: { id: TextAlign; icon: React.ReactNode; label: string }[] = [
  { id: 'left', icon: <AlignLeft size={13} />, label: 'Izquierda' },
  { id: 'center', icon: <AlignCenter size={13} />, label: 'Centro' },
  { id: 'right', icon: <AlignRight size={13} />, label: 'Derecha' },
  { id: 'justify', icon: <AlignJustify size={13} />, label: 'Justificar' },
]

export function BookConfigPanel({ onClose }: Props) {
  const pageConfig = useContentModeStore((s) => s.pageConfig)
  const setPageConfig = useContentModeStore((s) => s.setPageConfig)
  const docTextAlign = useBookLayoutStore((s) => s.layoutConfig?.textAlign) ?? 'left'
  const setDocTextAlign = useBookLayoutStore((s) => s.setDocTextAlign)
  const showHr = useBookLayoutStore((s) => s.layoutConfig?.showHr) ?? false
  const setShowHr = useBookLayoutStore((s) => s.setShowHr)

  const handlePaperSize = (size: string) => {
    if (size === 'custom') {
      setPageConfig({ ...pageConfig, paperSize: 'custom' })
    } else {
      const dims = PAPER_SIZES[size]
      if (dims) {
        setPageConfig({ ...pageConfig, paperSize: size as PageConfig['paperSize'], width: dims.width, height: dims.height })
      }
    }
  }

  const handleMargin = (side: keyof PageConfig['margins'], value: number) => {
    setPageConfig({
      ...pageConfig,
      margins: { ...pageConfig.margins, [side]: value },
    })
  }

  const inputCls = 'w-16 px-2 py-1 rounded border border-[var(--app-border)] bg-[var(--app-bg)] text-xs text-[var(--app-fg)]'

  return (
    <div className="edm-book-config-panel">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[var(--app-fg)] uppercase tracking-wider">
          Configuracion
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--app-bg2)] text-[var(--app-fg3)]"
        >
          <X size={12} />
        </button>
      </div>

      {/* Paper size */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Papel
        </label>
        <div className="flex gap-1 flex-wrap">
          {['a4', 'letter', 'legal', 'custom'].map((size) => (
            <button
              key={size}
              onClick={() => handlePaperSize(size)}
              className={`px-2 py-1 rounded border text-[10px] font-medium transition-colors ${
                pageConfig.paperSize === size
                  ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                  : 'border-[var(--app-border)] text-[var(--app-fg3)] hover:border-[var(--app-fg2)]'
              }`}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Custom dimensions */}
      {pageConfig.paperSize === 'custom' && (
        <div className="flex gap-2 mb-3">
          <div>
            <label className="text-[10px] text-[var(--app-fg3)] block mb-0.5">Ancho mm</label>
            <input
              type="number"
              value={pageConfig.width}
              onChange={(e) => setPageConfig({ ...pageConfig, width: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--app-fg3)] block mb-0.5">Alto mm</label>
            <input
              type="number"
              value={pageConfig.height}
              onChange={(e) => setPageConfig({ ...pageConfig, height: Number(e.target.value) })}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Margins */}
      <div className="mb-3">
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Margenes (mm)
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
            <div key={side} className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--app-fg3)] w-10">
                {{ top: 'Arriba', bottom: 'Abajo', left: 'Izq.', right: 'Der.' }[side]}
              </span>
              <input
                type="number"
                value={pageConfig.margins[side]}
                onChange={(e) => handleMargin(side, Number(e.target.value))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Show/hide horizontal rules */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showHr}
            onChange={(e) => setShowHr(e.target.checked)}
            className="accent-[var(--app-accent)]"
          />
          <span className="text-[11px] text-[var(--app-fg2)]">
            Mostrar separadores (---)
          </span>
        </label>
      </div>

      {/* Document text alignment */}
      <div>
        <label className="text-[10px] text-[var(--app-fg3)] uppercase tracking-wider block mb-1.5">
          Alineado general
        </label>
        <div className="flex items-center gap-1">
          {ALIGNS.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setDocTextAlign(id)}
              title={label}
              className={`p-1.5 rounded border transition-colors ${
                docTextAlign === id
                  ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                  : 'border-transparent text-[var(--app-fg3)] hover:text-[var(--app-fg2)]'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
