import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Save, Trash2, X } from 'lucide-react'
import { subscribeDialog, getDialogState, resolveDialog } from '@/lib/dialogs'

/**
 * Global dialog modal — renders confirm/save dialogs with app styling.
 * Place once in App.tsx, it auto-shows when dialogs.ts triggers one.
 */
export function DialogModal() {
  const [state, setState] = useState(getDialogState)

  useEffect(() => {
    return subscribeDialog(() => setState({ ...getDialogState() }))
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.open) return
    if (e.key === 'Escape') {
      resolveDialog(state.type === 'save' ? 'cancel' : 'no')
    }
  }, [state.open, state.type])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!state.open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in"
      onClick={() => resolveDialog(state.type === 'save' ? 'cancel' : 'no')}
    >
      <div
        className="bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-2xl
          w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-2">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--app-fg)]">{state.title}</h3>
          </div>
          <button
            onClick={() => resolveDialog(state.type === 'save' ? 'cancel' : 'no')}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors text-[var(--app-fg3)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 py-3">
          <p className="text-sm text-[var(--app-fg2)] leading-relaxed">{state.message}</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
          {state.type === 'confirm' ? (
            <>
              <button
                onClick={() => resolveDialog('no')}
                className="px-4 py-2 rounded-xl text-sm text-[var(--app-fg2)]
                  hover:bg-[var(--app-bg2)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolveDialog('yes')}
                autoFocus
                className="px-4 py-2 rounded-xl text-sm font-medium
                  bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Confirmar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => resolveDialog('cancel')}
                className="px-4 py-2 rounded-xl text-sm text-[var(--app-fg2)]
                  hover:bg-[var(--app-bg2)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolveDialog('discard')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                  bg-[var(--app-bg2)] text-[var(--app-fg1)] hover:bg-[var(--app-bg)] transition-colors"
              >
                <Trash2 size={14} />
                Descartar
              </button>
              <button
                onClick={() => resolveDialog('save')}
                autoFocus
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                  bg-[var(--app-accent)] text-white hover:opacity-90 transition-colors"
              >
                <Save size={14} />
                Guardar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
