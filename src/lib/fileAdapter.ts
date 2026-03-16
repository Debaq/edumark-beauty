/**
 * File I/O adapter — automatically uses Tauri native APIs when running
 * as a desktop app, or standard web APIs in the browser.
 */

export function isTauri(): boolean {
  return !!import.meta.env.TAURI_ENV_PLATFORM || '__TAURI_INTERNALS__' in window
}

/** Result from Rust commands */
interface FileMapResult {
  files: Record<string, string>
  errors: string[]
}

/** Convert Rust FileMapResult to JS Map */
function resultToMap(result: FileMapResult): Map<string, string> {
  return new Map(Object.entries(result.files))
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
 * Resolve an .edmindex by reading all referenced files from the same directory.
 * Tauri: uses Rust command (parallel, recursive) for speed.
 * Web: returns null.
 */
export async function resolveEdmIndexFromDisk(
  indexPath: string,
  _includes: string[],
): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<FileMapResult>('resolve_edmindex', { indexPath })
    return resultToMap(result)
  } catch {
    return null
  }
}

/**
 * Open a directory picker and read all text files recursively.
 * Tauri: uses Rust command (parallel walkdir) for speed.
 * Web: returns null (caller falls back to <input webkitdirectory>).
 */
export async function openDirectoryDialog(): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  const { open } = await import('@tauri-apps/plugin-dialog')
  const dir = await open({ directory: true, title: 'Abrir carpeta de proyecto' })
  if (!dir) return null

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<FileMapResult>('read_directory_files', { dirPath: dir })
    return resultToMap(result)
  } catch {
    return null
  }
}

/**
 * Read a ZIP file using Rust (parallel decompression).
 * Tauri only. Returns null in web.
 */
export async function readZipFromDisk(zipPath: string): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<FileMapResult>('read_zip_files', { zipPath })
    return resultToMap(result)
  } catch {
    return null
  }
}
