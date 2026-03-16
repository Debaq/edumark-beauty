import { useCallback, useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

/**
 * Custom titlebar for Tauri (frameless window).
 * Only rendered when isTauri() is true — never in web.
 * Uses data-tauri-drag-region for native window dragging.
 */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined
    ;(async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      setMaximized(await win.isMaximized())
      unlisten = await win.onResized(async () => {
        setMaximized(await win.isMaximized())
      })
    })()
    return () => { unlisten?.() }
  }, [])

  const handleMinimize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    getCurrentWindow().minimize()
  }, [])

  const handleToggleMaximize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    getCurrentWindow().toggleMaximize()
  }, [])

  const handleClose = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    getCurrentWindow().close()
  }, [])

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between bg-[var(--app-bg1)]
        border-b border-[var(--app-border)] select-none shrink-0"
    >
      {/* Izquierda: logo + nombre */}
      <div data-tauri-drag-region className="flex items-center gap-2 px-3 flex-1">
        <img src={`${import.meta.env.BASE_URL}icon-192.webp`} alt="" className="w-4 h-4" />
        <span data-tauri-drag-region className="text-[11px] text-[var(--app-fg2)] font-medium">
          Edumark Beauty
        </span>
      </div>

      {/* Derecha: controles de ventana */}
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-3 flex items-center justify-center
            text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] transition-colors"
          title="Minimizar"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleToggleMaximize}
          className="h-full px-3 flex items-center justify-center
            text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] transition-colors"
          title={maximized ? 'Restaurar' : 'Maximizar'}
        >
          {maximized ? <Square size={11} /> : <Maximize2 size={13} />}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-3 flex items-center justify-center
            text-[var(--app-fg2)] hover:bg-red-500 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
