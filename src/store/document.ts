import { create } from 'zustand'
import { resolveEdmIndex } from '@/lib/edmindex'
import { decodeAsync } from 'edumark-js'

export interface Chapter {
  /** Ruta del archivo (de @include) */
  path: string
  /** Título extraído del primer heading o del nombre de archivo */
  title: string
  /** Texto fuente .edm */
  source: string
  /** HTML decodificado */
  html: string
}

interface DocumentStore {
  /** Texto fuente activo (capítulo actual o fusionado en modo libro) */
  source: string
  /** Nombre del archivo cargado */
  filename: string
  /** HTML resultante del decode */
  html: string

  /** True si se cargó desde un .edmindex */
  isProject: boolean
  /** Capítulos del proyecto (en orden del índice) */
  chapters: Chapter[]
  /** Índice del capítulo activo (para HTML/Presentación) */
  activeChapterIndex: number
  /** Source del .edmindex original */
  indexSource: string
  /** URL remota del .edm (si se cargó desde URL) */
  sourceUrl: string
  /** Ruta local del archivo (Tauri: para guardar sin diálogo) */
  filePath: string
  /** Source fusionado (todos los capítulos, para modo libro) */
  mergedSource: string
  /** HTML fusionado decodificado */
  mergedHtml: string
  /** True si hay cambios sin guardar */
  dirty: boolean

  setSource: (source: string) => void
  setFilename: (name: string) => void
  setHtml: (html: string) => void
  setSourceUrl: (url: string) => void
  setFilePath: (path: string) => void

  /** Carga un proyecto completo con capítulos */
  loadProject: (data: {
    filename: string
    indexSource: string
    chapters: Chapter[]
    mergedSource: string
    mergedHtml: string
  }) => void

  /** Cambia al capítulo indicado (guarda edits del actual primero) */
  setActiveChapter: (index: number) => void

  /** Guarda el source/html actual de vuelta al capítulo activo */
  syncChapterFromEditor: () => void

  /** Cambia a vista fusionada (modo libro) — guarda capítulo actual y reconstruye */
  switchToMerged: () => Promise<void>

  /** Vuelve a la vista de capítulo individual — restaura el capítulo activo */
  switchToChapter: () => void

  /** Actualiza el mergedSource/mergedHtml regenerándolo de los capítulos */
  rebuildMerged: (mergedSource: string, mergedHtml: string) => void

  reset: () => void
}

/** Extrae el título del primer heading de un source .edm, o usa el filename */
function extractTitle(source: string, path: string): string {
  const match = source.match(/^#{1,3}\s+(.+)/m)
  if (match) return match[1].trim()
  return path.replace(/\.edm$/, '').replace(/[_-]/g, ' ')
}

export { extractTitle }

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  source: '',
  filename: '',
  html: '',
  sourceUrl: '',
  filePath: '',
  isProject: false,
  chapters: [],
  activeChapterIndex: 0,
  indexSource: '',
  mergedSource: '',
  mergedHtml: '',
  dirty: false,

  setSource: (source) => set({ source, dirty: true }),
  setFilename: (name) => set({ filename: name }),
  setHtml: (html) => set({ html }),
  setSourceUrl: (url) => set({ sourceUrl: url }),
  setFilePath: (path) => set({ filePath: path }),

  loadProject: ({ filename, indexSource, chapters, mergedSource, mergedHtml }) => {
    const first = chapters[0]
    set({
      isProject: true,
      filename,
      indexSource,
      chapters,
      activeChapterIndex: 0,
      mergedSource,
      mergedHtml,
      // Empezar mostrando el primer capítulo
      source: first?.source ?? '',
      html: first?.html ?? '',
      dirty: false,
    })
  },

  setActiveChapter: (index) => {
    const state = get()
    if (!state.isProject || index === state.activeChapterIndex) return
    if (index < 0 || index >= state.chapters.length) return

    // Guardar edits del capítulo actual
    const updated = [...state.chapters]
    updated[state.activeChapterIndex] = {
      ...updated[state.activeChapterIndex],
      source: state.source,
      html: state.html,
    }

    const next = updated[index]
    set({
      chapters: updated,
      activeChapterIndex: index,
      source: next.source,
      html: next.html,
    })
  },

  syncChapterFromEditor: () => {
    const state = get()
    if (!state.isProject) return

    const updated = [...state.chapters]
    updated[state.activeChapterIndex] = {
      ...updated[state.activeChapterIndex],
      source: state.source,
      html: state.html,
    }
    set({ chapters: updated })
  },

  switchToMerged: async () => {
    const state = get()
    if (!state.isProject) return

    // Guardar capítulo actual
    const updated = [...state.chapters]
    updated[state.activeChapterIndex] = {
      ...updated[state.activeChapterIndex],
      source: state.source,
      html: state.html,
    }

    // Reconstruir merged desde los capítulos actualizados
    const fileMap = new Map<string, string>()
    for (const ch of updated) {
      fileMap.set(ch.path, ch.source)
      const base = ch.path.split('/').pop() ?? ch.path
      fileMap.set(base, ch.source)
    }
    const { resolved } = resolveEdmIndex(state.indexSource, fileMap)

    let mergedHtml: string
    try {
      mergedHtml = await decodeAsync(resolved, { mode: 'teacher' })
    } catch {
      mergedHtml = state.mergedHtml // fallback al anterior
    }

    set({
      chapters: updated,
      mergedSource: resolved,
      mergedHtml,
      source: resolved,
      html: mergedHtml,
    })
  },

  switchToChapter: () => {
    const state = get()
    if (!state.isProject) return

    const chapter = state.chapters[state.activeChapterIndex]
    if (chapter) {
      set({
        source: chapter.source,
        html: chapter.html,
      })
    }
  },

  rebuildMerged: (mergedSource, mergedHtml) => {
    set({ mergedSource, mergedHtml })
  },

  reset: () =>
    set({
      source: '',
      filename: '',
      html: '',
      sourceUrl: '',
      filePath: '',
      isProject: false,
      chapters: [],
      activeChapterIndex: 0,
      indexSource: '',
      mergedSource: '',
      mergedHtml: '',
      dirty: false,
    }),
}))
