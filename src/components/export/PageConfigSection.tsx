import { useContentModeStore } from '@/store/contentMode'
import { PAPER_SIZES, type PageConfig } from '@/types/contentMode'

export function PageConfigSection() {
  const pageConfig = useContentModeStore((s) => s.pageConfig)
  const setPageConfig = useContentModeStore((s) => s.setPageConfig)
  const contentMode = useContentModeStore((s) => s.contentMode)
  const slideConfig = useContentModeStore((s) => s.slideConfig)
  const setSlideConfig = useContentModeStore((s) => s.setSlideConfig)

  if (contentMode === 'presentation') {
    return (
      <div className="mb-4 p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)]">
        <h3 className="text-xs font-semibold text-[var(--app-fg2)] mb-3">Formato de diapositiva</h3>
        <div className="flex gap-2">
          {(['16:9', '4:3'] as const).map((ratio) => (
            <button
              key={ratio}
              onClick={() => setSlideConfig({ ...slideConfig, ratio })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                slideConfig.ratio === ratio
                  ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-bg2)]'
                  : 'border-[var(--app-border)] text-[var(--app-fg3)] hover:border-[var(--app-fg2)]'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (contentMode === 'book') {
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

    return (
      <div className="mb-4 p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)]">
        <h3 className="text-xs font-semibold text-[var(--app-fg2)] mb-3">Configuracion de pagina</h3>

        {/* Paper size */}
        <div className="mb-3">
          <label className="text-xs text-[var(--app-fg3)] mb-1 block">Tamano de papel</label>
          <div className="flex gap-2 flex-wrap">
            {['a4', 'letter', 'legal', 'custom'].map((size) => (
              <button
                key={size}
                onClick={() => handlePaperSize(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  pageConfig.paperSize === size
                    ? 'border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-bg2)]'
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
              <label className="text-xs text-[var(--app-fg3)]">Ancho (mm)</label>
              <input
                type="number"
                value={pageConfig.width}
                onChange={(e) => setPageConfig({ ...pageConfig, width: Number(e.target.value) })}
                className="w-20 mt-1 px-2 py-1 rounded border border-[var(--app-border)] bg-[var(--app-bg1)]
                  text-xs text-[var(--app-fg)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--app-fg3)]">Alto (mm)</label>
              <input
                type="number"
                value={pageConfig.height}
                onChange={(e) => setPageConfig({ ...pageConfig, height: Number(e.target.value) })}
                className="w-20 mt-1 px-2 py-1 rounded border border-[var(--app-border)] bg-[var(--app-bg1)]
                  text-xs text-[var(--app-fg)]"
              />
            </div>
          </div>
        )}

        {/* Margins */}
        <div>
          <label className="text-xs text-[var(--app-fg3)] mb-1 block">Margenes (mm)</label>
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
              <div key={side} className="flex items-center gap-2">
                <span className="text-xs text-[var(--app-fg3)] w-14 capitalize">
                  {{ top: 'Arriba', bottom: 'Abajo', left: 'Izquierda', right: 'Derecha' }[side]}
                </span>
                <input
                  type="number"
                  value={pageConfig.margins[side]}
                  onChange={(e) => handleMargin(side, Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded border border-[var(--app-border)] bg-[var(--app-bg1)]
                    text-xs text-[var(--app-fg)]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
