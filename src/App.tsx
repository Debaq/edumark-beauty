import { useEffect, useRef, useState } from 'react'
import { useDocumentStore } from '@/store/document'
import { useUIStore } from '@/store/ui'
import { useThemeStore, PRESETS, type PresetKey } from '@/store/theme'
import { Welcome } from '@/components/layout/Welcome'
import { Toolbar } from '@/components/layout/Toolbar'
import { Panels } from '@/components/layout/Panels'
import { ConfigPanel } from '@/components/config/ConfigPanel'
import { ExportModal } from '@/components/export/ExportModal'
import { HelpModal } from '@/components/layout/HelpModal'
import { SkillsModal } from '@/components/layout/SkillsModal'
import { ToastContainer } from '@/components/ui/Toast'
import { Preview } from '@/components/preview/Preview'
import { TitleBar } from '@/components/layout/TitleBar'
import { isTauri, quickSave, saveFile } from '@/lib/fileAdapter'
import { confirmSave } from '@/lib/dialogs'
import { decodeAsync } from 'edumark-js'
import { isEdmIndex, fetchEdmIndexFromUrl, resolveEdmIndex, parseAllIncludes } from '@/lib/edmindex'
import { extractTitle } from '@/store/document'
import type { Chapter } from '@/store/document'

/** Apply a theme from URL parameter: preset name or base64-encoded config */
function applyThemeFromParam(themeParam: string) {
  const store = useThemeStore.getState()
  if (themeParam in PRESETS) {
    store.applyPreset(themeParam as PresetKey)
    return
  }
  try {
    const json = JSON.parse(atob(themeParam))
    store.importTheme(json)
  } catch { /* ignore */ }
}

/** Loads a single .edm from a remote URL into the store */
async function loadSingleFromUrl(url: string, text: string, themeOverride?: string | null) {
  const name = url.split('/').pop()?.split('?')[0] || 'remote.edm'
  useThemeStore.getState().loadThemeFromSource(text)
  useDocumentStore.getState().reset()
  useDocumentStore.getState().setSource(text)
  useDocumentStore.getState().setFilename(name)
  useDocumentStore.getState().setSourceUrl(url)
  if (themeOverride) applyThemeFromParam(themeOverride)
  try {
    useDocumentStore.getState().setHtml(await decodeAsync(text, { mode: 'teacher' }))
  } catch {
    useDocumentStore.getState().setHtml('<p style="color:#f87171;">Error al parsear el documento.</p>')
  }
}

/** Loads a remote .edmindex project into the store */
async function loadEdmIndexFromUrl(url: string, themeOverride?: string | null) {
  const { indexSource, indexName, fileMap } = await fetchEdmIndexFromUrl(url)

  const allIncludes = parseAllIncludes(indexSource)
  const { resolved, missing } = resolveEdmIndex(indexSource, fileMap)

  if (missing.length > 0) {
    useUIStore.getState().addToast(`${missing.length} archivo(s) no encontrado(s): ${missing.join(', ')}`, 'error')
  }

  const chapters: Chapter[] = []
  for (const path of allIncludes) {
    const baseName = path.split('/').pop() ?? path
    const content = fileMap.get(path) ?? fileMap.get(baseName)
    if (content != null) {
      let html: string
      try { html = await decodeAsync(content, { mode: 'teacher' }) }
      catch { html = '<p style="color:#f87171;">Error al parsear este capitulo.</p>' }
      chapters.push({ path, title: extractTitle(content, path), source: content, html })
    }
  }

  let mergedHtml: string
  try { mergedHtml = await decodeAsync(resolved, { mode: 'teacher' }) }
  catch { mergedHtml = '<p style="color:#f87171;">Error al parsear el documento fusionado.</p>' }

  useThemeStore.getState().loadThemeFromSource(resolved)
  useDocumentStore.getState().loadProject({ filename: indexName, indexSource, chapters, mergedSource: resolved, mergedHtml })
  useDocumentStore.getState().setSourceUrl(url)
  if (themeOverride) applyThemeFromParam(themeOverride)
}

/** Loads from URL — detects .edmindex vs single .edm */
async function loadFromUrl(url: string, themeOverride?: string | null) {
  if (isEdmIndex(url)) {
    return loadEdmIndexFromUrl(url, themeOverride)
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  return loadSingleFromUrl(url, text, themeOverride)
}

export default function App() {
  const source = useDocumentStore((s) => s.source)
  const configPanelOpen = useUIStore((s) => s.configPanelOpen)
  const autoLoaded = useRef(false)
  const [embedMode, setEmbedMode] = useState(false)

  // Auto-load from ?url= query parameter; ?mode=embed for read-only preview
  useEffect(() => {
    if (autoLoaded.current) return
    const params = new URLSearchParams(window.location.search)
    const url = params.get('url')
    if (!url) return
    autoLoaded.current = true

    const isEmbed = params.get('mode') === 'embed'
    if (isEmbed) {
      setEmbedMode(true)
    }

    const themeOverride = params.get('theme')
    loadFromUrl(url, themeOverride)
      .then(() => {
        // In embed mode, always use full width (the iframe IS the width constraint)
        if (isEmbed) {
          useThemeStore.getState().set('contentMaxWidth', 100000)
          useThemeStore.getState().set('contentPadding', 16)
        }
      })
      .catch(() => {
        useUIStore.getState().addToast('No se pudo cargar el archivo desde la URL', 'error')
      })
  }, [])

  // Tauri: intercept window close, ask to save unsaved work
  useEffect(() => {
    if (!isTauri()) return
    let unlisten: (() => void) | undefined
    ;(async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const win = getCurrentWindow()
        unlisten = await win.onCloseRequested(async (event) => {
          const state = useDocumentStore.getState()
          if (!state.source) {
            // No document open, close directly
            return
          }

          event.preventDefault()

          const answer = await confirmSave('¿Guardar cambios antes de cerrar?')
          if (answer === 'save') {
            // Try quick-save if we have a path
            const saved = await quickSave(state.source, state.filePath)
            if (!saved) {
              // No path known: use save dialog
              const blob = new Blob([state.source], { type: 'text/plain;charset=utf-8' })
              await saveFile(blob, state.filename || 'documento.edm')
            }
          }
          // Both 'save' (after saving) and 'discard' close the window
          await win.destroy()
        })
      } catch { /* not in Tauri */ }
    })()
    return () => { unlisten?.() }
  }, [])

  const showTitleBar = isTauri()

  // Embed mode: solo el preview, sin editor ni toolbar
  if (embedMode) {
    return (
      <div className="h-full flex flex-col">
        <Preview />
      </div>
    )
  }

  // Si no hay documento cargado, mostrar pantalla de bienvenida
  if (!source) {
    return (
      <div className="h-full flex flex-col">
        {showTitleBar && <TitleBar />}
        <Welcome />
        <HelpModal />
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {showTitleBar && <TitleBar />}
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <Panels />
        {configPanelOpen && <ConfigPanel />}
      </div>
      <ExportModal />
      <SkillsModal />
      <HelpModal />
      <ToastContainer />
    </div>
  )
}
