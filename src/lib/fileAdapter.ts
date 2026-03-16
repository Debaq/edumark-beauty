/**
 * File I/O adapter — automatically uses Tauri native APIs when running
 * as a desktop app, or standard web APIs in the browser.
 */

export function isTauri(): boolean {
  return !!import.meta.env.TAURI_ENV_PLATFORM || '__TAURI_INTERNALS__' in window
}

/**
 * Save a Blob to disk.
 * - Tauri: opens a native "Save As" dialog, writes bytes via plugin-fs.
 * - Web: triggers a browser download via file-saver.
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({ defaultPath: filename })
    if (!path) return
    const buffer = await blob.arrayBuffer()
    await writeFile(path, new Uint8Array(buffer))
  } else {
    const { saveAs } = await import('file-saver')
    saveAs(blob, filename)
  }
}

/**
 * Save a text string to disk (convenience wrapper).
 */
export async function saveTextFile(content: string, filename: string): Promise<void> {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  return saveFile(blob, filename)
}

/**
 * Quick-save text to a known path (Tauri only, no dialog).
 * Returns true if saved, false if not applicable (web or no path).
 */
export async function quickSave(content: string, filePath: string): Promise<boolean> {
  if (!isTauri() || !filePath) return false
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')
  await writeTextFile(filePath, content)
  return true
}

/** Result from opening a file */
export interface OpenedFile {
  name: string
  content: string
  /** Full filesystem path (Tauri only) */
  path?: string
}

/**
 * Open a file picker and read selected files as text.
 * - Tauri: native open dialog + fs.readTextFile.
 * - Web: returns null (caller falls back to <input type="file">).
 */
export async function openFileDialog(options?: {
  extensions?: string[]
  multiple?: boolean
  title?: string
}): Promise<OpenedFile[] | null> {
  if (!isTauri()) return null

  const { open } = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')

  const selected = await open({
    multiple: options?.multiple ?? false,
    title: options?.title,
    filters: options?.extensions
      ? [{ name: 'Documentos', extensions: options.extensions }]
      : undefined,
  })
  if (!selected) return null

  const paths = Array.isArray(selected) ? selected : [selected]
  const results: OpenedFile[] = []

  for (const p of paths) {
    const content = await readTextFile(p)
    const name = p.split(/[/\\]/).pop() || 'file'
    results.push({ name, content, path: p })
  }

  return results
}

/**
 * Open a directory picker and read all .edm/.edmindex files recursively.
 * - Tauri: native directory dialog + fs.readDir/readTextFile.
 * - Web: returns null (caller falls back to <input webkitdirectory>).
 */
export async function openDirectoryDialog(): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  const { open } = await import('@tauri-apps/plugin-dialog')
  const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs')

  const dir = await open({ directory: true, title: 'Abrir carpeta de proyecto' })
  if (!dir) return null

  const fileMap = new Map<string, string>()

  async function walk(basePath: string, prefix: string) {
    const entries = await readDir(basePath)
    for (const entry of entries) {
      const fullPath = `${basePath}/${entry.name}`
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory) {
        await walk(fullPath, relPath)
      } else if (
        entry.name.endsWith('.edm') ||
        entry.name.endsWith('.edmindex') ||
        entry.name.endsWith('.md') ||
        entry.name.endsWith('.txt')
      ) {
        const content = await readTextFile(fullPath)
        fileMap.set(relPath, content)
        fileMap.set(entry.name, content)
      }
    }
  }

  await walk(dir, '')
  return fileMap
}
