/**
 * Custom dialog system — renders styled modals in the app UI.
 * Uses a global resolver pattern to bridge imperative calls with React rendering.
 */

type DialogType = 'confirm' | 'save'

interface DialogState {
  open: boolean
  type: DialogType
  title: string
  message: string
  resolve: ((value: string) => void) | null
}

// Global state + listeners for the dialog
let currentDialog: DialogState = { open: false, type: 'confirm', title: '', message: '', resolve: null }
const listeners = new Set<() => void>()

function notify() { listeners.forEach((fn) => fn()) }

export function subscribeDialog(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function getDialogState(): DialogState { return currentDialog }

export function resolveDialog(value: string) {
  if (currentDialog.resolve) {
    currentDialog.resolve(value)
  }
  currentDialog = { open: false, type: 'confirm', title: '', message: '', resolve: null }
  notify()
}

function showDialog(type: DialogType, title: string, message: string): Promise<string> {
  return new Promise((resolve) => {
    currentDialog = { open: true, type, title, message, resolve }
    notify()
  })
}

/**
 * Show a confirmation dialog. Returns true/false.
 */
export async function confirm(message: string, title = 'Confirmar'): Promise<boolean> {
  const result = await showDialog('confirm', title, message)
  return result === 'yes'
}

/**
 * Show a save dialog before closing. Returns 'save' | 'discard' | 'cancel'.
 */
export async function confirmSave(message: string): Promise<'save' | 'discard' | 'cancel'> {
  const result = await showDialog('save', 'Cambios sin guardar', message)
  return result as 'save' | 'discard' | 'cancel'
}
