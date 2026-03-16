import { isTauri } from '@/lib/fileAdapter'

/**
 * Show a confirmation dialog.
 * Tauri: native OS dialog. Web: browser confirm().
 */
export async function confirm(message: string, title?: string): Promise<boolean> {
  if (isTauri()) {
    try {
      const { ask } = await import('@tauri-apps/plugin-dialog')
      return await ask(message, { title: title ?? 'Confirmar', kind: 'warning' })
    } catch {
      // fallback
    }
  }
  return window.confirm(message)
}

/**
 * Show a yes/no/cancel save dialog before closing.
 * Returns 'save' | 'discard' | 'cancel'.
 */
export async function confirmSave(message: string): Promise<'save' | 'discard' | 'cancel'> {
  if (isTauri()) {
    try {
      const { ask } = await import('@tauri-apps/plugin-dialog')
      // Ask "Save changes?"  Yes = save, No = discard
      const wantSave = await ask(message, {
        title: 'Cambios sin guardar',
        kind: 'warning',
        okLabel: 'Guardar',
        cancelLabel: 'Descartar',
      })
      return wantSave ? 'save' : 'discard'
    } catch {
      // fallback
    }
  }
  const result = window.confirm(message + '\n\nAceptar = Guardar, Cancelar = Descartar')
  return result ? 'save' : 'discard'
}
