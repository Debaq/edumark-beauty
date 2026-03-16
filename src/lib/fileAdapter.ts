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
 * Tries Rust command first (fast, parallel). Falls back to JS (sequential).
 * Web: returns null.
 */
export async function resolveEdmIndexFromDisk(
  indexPath: string,
  includes: string[],
): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  // Try Rust command first
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<FileMapResult>('resolve_edmindex', {
      indexPath,
    })
    console.log('[fileAdapter] Rust resolve_edmindex result:', Object.keys(result.files).length, 'files,', result.errors.length, 'errors')
    if (result.errors.length > 0) console.warn('[fileAdapter] Rust errors:', result.errors)
    if (Object.keys(result.files).length > 0) {
      return resultToMap(result)
    }
  } catch (e) {
    console.warn('[fileAdapter] Rust resolve_edmindex failed:', e)
  }

  // JS fallback: read files one by one via plugin-fs
  console.log('[fileAdapter] Trying JS fallback for', includes.length, 'includes')
  const result = await resolveEdmIndexJS(indexPath, includes)
  console.log('[fileAdapter] JS fallback result:', result.size, 'files')
  return result
}

/** JS fallback for resolving edmindex includes from disk */
async function resolveEdmIndexJS(
  indexPath: string,
  includes: string[],
): Promise<Map<string, string>> {
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const dir = indexPath.replace(/[/\\][^/\\]+$/, '')
  const fileMap = new Map<string, string>()
  const fetched = new Set<string>()

  async function resolve(paths: string[]) {
    for (const relPath of paths) {
      const baseName = relPath.split('/').pop() ?? relPath
      if (fetched.has(relPath) || fetched.has(baseName)) continue
      fetched.add(relPath)
      fetched.add(baseName)

      const fullPath = `${dir}/${relPath}`
      console.log('[fileAdapter] JS reading:', fullPath)
      try {
        const content = await readTextFile(fullPath)
        console.log('[fileAdapter] JS read OK:', relPath, content.length, 'chars')
        fileMap.set(relPath, content)
        fileMap.set(baseName, content)

        // Check for nested includes
        const nestedPaths: string[] = []
        const atIncludes = content.matchAll(/@include\(([^)]+)\)/g)
        for (const m of atIncludes) nestedPaths.push(m[1])
        const blockIncludes = content.matchAll(/:{2,3}include\s+file="([^"]+)"/g)
        for (const m of blockIncludes) nestedPaths.push(m[1])
        if (nestedPaths.length > 0) await resolve(nestedPaths)
      } catch (e) {
        console.warn('[fileAdapter] JS read FAILED:', fullPath, e)
      }
    }
  }

  await resolve(includes)
  return fileMap
}

/**
 * Open a directory picker and read all text files recursively.
 * Tries Rust command (parallel walkdir), falls back to JS.
 * Web: returns null.
 */
export async function openDirectoryDialog(): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  const { open } = await import('@tauri-apps/plugin-dialog')
  const dir = await open({ directory: true, title: 'Abrir carpeta de proyecto' })
  if (!dir) return null

  // Try Rust command first
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<FileMapResult>('read_directory_files', { dirPath: dir })
    if (result && Object.keys(result.files).length > 0) {
      return resultToMap(result)
    }
  } catch (e) {
    console.warn('[fileAdapter] Rust read_directory_files failed, using JS fallback:', e)
  }

  // JS fallback
  const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs')
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

/**
 * Read a ZIP file using Rust (parallel decompression).
 * Falls back to JS if Rust command not available.
 * Tauri only. Returns null in web.
 */
export async function readZipFromDisk(zipPath: string): Promise<Map<string, string> | null> {
  if (!isTauri()) return null

  // Try Rust command first
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<FileMapResult>('read_zip_files', { zipPath })
    if (result && Object.keys(result.files).length > 0) {
      return resultToMap(result)
    }
  } catch (e) {
    console.warn('[fileAdapter] Rust read_zip_files failed, using JS fallback:', e)
  }

  // JS fallback: read via plugin-fs + jszip
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const bytes = await readFile(zipPath)
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(bytes)
  const fileMap = new Map<string, string>()
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir && (path.endsWith('.edm') || path.endsWith('.edmindex') || path.endsWith('.md') || path.endsWith('.txt'))) {
      const text = await entry.async('text')
      fileMap.set(path, text)
      const baseName = path.split('/').pop()
      if (baseName) fileMap.set(baseName, text)
    }
  }
  return fileMap
}
