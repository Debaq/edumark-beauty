import { useCallback, useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

/**
 * Custom titlebar for Tauri (frameless window).
 * Only rendered when isTauri() is true — never in web.
 */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const win = getCurrentWindow()
        if (cancelled) return
        setMaximized(await win.isMaximized())
        unlisten = await win.onResized(async () => {
          setMaximized(await win.isMaximized())
        })
      } catch { /* not in Tauri */ }
    })()
    return () => { cancelled = true; unlisten?.() }
  }, [])

  const handleMinimize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().minimize()
    } catch { /* ignore */ }
  }, [])

  const handleToggleMaximize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().toggleMaximize()
    } catch { /* ignore */ }
  }, [])

  const handleClose = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    } catch { /* ignore */ }
  }, [])

  const handleDragStart = useCallback(async (e: React.MouseEvent) => {
    // Only drag on left-click, and not on buttons
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().startDragging()
    } catch { /* ignore */ }
  }, [])

  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().toggleMaximize()
    } catch { /* ignore */ }
  }, [])

  return (
    <div
      onMouseDown={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="h-8 flex items-center justify-between bg-[var(--app-bg1)]
        border-b border-[var(--app-border)] select-none shrink-0 cursor-default"
    >
      {/* Izquierda: logo + nombre */}
      <div className="flex items-center gap-2 px-3 flex-1 pointer-events-none">
        <img src={`${import.meta.env.BASE_URL}icon-192.webp`} alt="" className="w-4 h-4" />
        <span className="text-[11px] text-[var(--app-fg2)] font-medium">
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
