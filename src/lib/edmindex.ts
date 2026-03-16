/**
 * Soporte para archivos .edmindex — índices de proyecto que referencian
 * múltiples archivos .edm mediante directivas @include(ruta.edm).
 */

import JSZip from 'jszip'

const INCLUDE_RE = /^@include\((.+?)\)\s*$/
const BLOCK_INCLUDE_RE = /^:::include\s+file="([^"]+)"/
const PREPROCESSOR_INCLUDE_RE = /^::include\s+file="([^"]+)"\s*$/

/** Verifica si un nombre de archivo es .edmindex */
export function isEdmIndex(filename: string): boolean {
  return filename.endsWith('.edmindex')
}

/** Extrae las rutas de @include del source (solo directiva edmindex) */
export function parseIncludes(source: string): string[] {
  const paths: string[] = []
  for (const line of source.split('\n')) {
    const m = line.trim().match(INCLUDE_RE)
    if (m) paths.push(m[1])
  }
  return paths
}

/** Extrae las rutas de :::include file="..." (visible include links) */
export function parseBlockIncludes(source: string): string[] {
  const paths: string[] = []
  const seen = new Set<string>()
  for (const line of source.split('\n')) {
    const m = line.trim().match(BLOCK_INCLUDE_RE)
    if (m && !seen.has(m[1])) {
      seen.add(m[1])
      paths.push(m[1])
    }
  }
  return paths
}

/**
 * Extrae TODAS las rutas referenciadas en un source:
 * @include(), ::include file="", :::include file=""
 * Preserva el orden de aparición en el source.
 */
export function parseAllIncludes(source: string): string[] {
  const seen = new Set<string>()
  const paths: string[] = []

  const add = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p)
      paths.push(p)
    }
  }

  for (const line of source.split('\n')) {
    const trimmed = line.trim()

    const atMatch = trimmed.match(INCLUDE_RE)
    if (atMatch) { add(atMatch[1]); continue }

    // :::include antes de ::include para evitar falso positivo
    const blockMatch = trimmed.match(BLOCK_INCLUDE_RE)
    if (blockMatch) { add(blockMatch[1]); continue }

    const preMatch = trimmed.match(PREPROCESSOR_INCLUDE_RE)
    if (preMatch) { add(preMatch[1]); continue }
  }

  return paths
}

/**
 * Descubre recursivamente todos los archivos necesarios a partir de
 * un source raíz y un fileMap parcial.
 * Retorna las rutas que NO están en el fileMap.
 */
export function findMissingRecursive(
  rootSource: string,
  fileMap: Map<string, string>,
): string[] {
  const needed = new Set<string>()
  const scanned = new Set<string>()

  function scan(source: string) {
    for (const path of parseAllIncludes(source)) {
      if (needed.has(path)) continue
      needed.add(path)

      const base = baseName(path)
      const content = fileMap.get(path) ?? fileMap.get(base)
      if (content != null && !scanned.has(path)) {
        scanned.add(path)
        scan(content)
      }
    }
  }

  scan(rootSource)

  return Array.from(needed).filter((path) => {
    const base = baseName(path)
    return !fileMap.has(path) && !fileMap.has(base)
  })
}

/**
 * Resuelve un .edmindex: reemplaza cada @include(ruta) con el contenido
 * del archivo correspondiente del fileMap.
 * Los includes no encontrados se dejan como comentario visible.
 */
export function resolveEdmIndex(
  indexSource: string,
  fileMap: Map<string, string>,
): { resolved: string; missing: string[] } {
  const missing: string[] = []

  const resolved = indexSource
    .split('\n')
    .map((line) => {
      const m = line.trim().match(INCLUDE_RE)
      if (!m) return line

      const path = m[1]
      // Buscar por nombre exacto o sin ruta (por si el fileMap tiene paths relativos)
      const content = fileMap.get(path) ?? fileMap.get(baseName(path))
      if (content != null) {
        return content.trimEnd()
      }

      missing.push(path)
      return `<!-- @include no encontrado: ${path} -->`
    })
    .join('\n')

  return { resolved, missing }
}

/** Extrae el nombre base de una ruta */
function baseName(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return i >= 0 ? path.slice(i + 1) : path
}

/**
 * Lee recursivamente todos los archivos de un FileSystemDirectoryEntry.
 * Devuelve un Map<ruta relativa, contenido texto>.
 */
export async function readDirectoryEntries(
  dirEntry: FileSystemDirectoryEntry,
  prefix = '',
): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>()

  const entries = await new Promise<FileSystemEntry[]>((resolve) => {
    const reader = dirEntry.createReader()
    const all: FileSystemEntry[] = []
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all)
        } else {
          all.push(...batch)
          readBatch()
        }
      })
    }
    readBatch()
  })

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isFile) {
      const ext = entry.name.toLowerCase()
      if (ext.endsWith('.edm') || ext.endsWith('.edmindex') || ext.endsWith('.md')) {
        const content = await readFileEntry(entry as FileSystemFileEntry)
        // Guardar con ruta relativa y también con nombre base
        fileMap.set(relativePath, content)
        if (prefix) fileMap.set(entry.name, content)
      }
    } else if (entry.isDirectory) {
      const sub = await readDirectoryEntries(entry as FileSystemDirectoryEntry, relativePath)
      for (const [k, v] of sub) fileMap.set(k, v)
    }
  }

  return fileMap
}

function readFileEntry(entry: FileSystemFileEntry): Promise<string> {
  return new Promise((resolve, reject) => {
    entry.file((file) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }, reject)
  })
}

/**
 * Lee todos los archivos de una lista de File (de input[webkitdirectory]).
 * Devuelve un Map<ruta relativa, contenido texto>.
 */
export async function readFileList(files: FileList): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>()

  for (const file of files) {
    const ext = file.name.toLowerCase()
    if (ext.endsWith('.edm') || ext.endsWith('.edmindex') || ext.endsWith('.md')) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
      })

      // webkitRelativePath tiene formato "carpeta/archivo.edm"
      const relPath = file.webkitRelativePath
        ? file.webkitRelativePath.replace(/^[^/]+\//, '') // quitar carpeta raíz
        : file.name
      fileMap.set(relPath, content)
      // También guardar por nombre base
      fileMap.set(file.name, content)
    }
  }

  return fileMap
}

/**
 * Busca el archivo .edmindex en un fileMap.
 * Retorna [nombre, contenido] o null si no hay.
 */
export function findEdmIndex(fileMap: Map<string, string>): [string, string] | null {
  for (const [name, content] of fileMap) {
    if (isEdmIndex(name)) return [name, content]
  }
  return null
}

/** Verifica si un archivo es un ZIP */
export function isZipFile(file: File): boolean {
  return (
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip')
  )
}

/**
 * Lee un archivo .zip y extrae todos los .edm/.edmindex/.md como texto.
 * Devuelve un Map<ruta relativa, contenido texto>.
 */
export async function readZipFile(file: File): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>()
  const zip = await JSZip.loadAsync(file)

  const promises: Promise<void>[] = []

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return

    const name = entry.name.toLowerCase()
    if (name.endsWith('.edm') || name.endsWith('.edmindex') || name.endsWith('.md')) {
      promises.push(
        entry.async('string').then((content) => {
          // Guardar con ruta completa dentro del zip
          fileMap.set(relativePath, content)
          // También con nombre base
          const base = baseName(relativePath)
          fileMap.set(base, content)
        })
      )
    }
  })

  await Promise.all(promises)
  return fileMap
}
