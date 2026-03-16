import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { formattingKeymap } from './editor-commands'
import { sectionColors } from './section-colors'
import { blockNesting } from './block-nesting'
import { codeHighlight } from './code-highlight'
import { markdownHighlight } from './markdown-highlight'
import { commentFold } from './comment-fold'
import { tableFormatter } from './table-formatter'
import { svgEditWidget, svgEditWidgetTheme } from './svg-edit-widget'
import { mermaidZoomWidget, mermaidZoomWidgetTheme } from './mermaid-zoom-widget'
import { mermaidEditWidget, mermaidEditWidgetTheme } from './mermaid-edit-widget'
import { imagePreviewWidget, imagePreviewWidgetTheme } from './image-preview-widget'
import { imageToWebpBase64 } from '@/lib/imageToBase64'
import { useDocumentStore } from '@/store/document'
import { decodeAsync } from 'edumark-js'


/** Insert a :::image block with the given data URI at the current cursor position */
function insertImageBlock(view: EditorView, dataUri: string) {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const isEmptyLine = line.text.trim() === '' && pos === line.from
  const prefix = isEmptyLine ? '' : '\n\n'
  const id = `fig-${Date.now()}`
  const block = `${prefix}:::image id="${id}"\nfile: ${dataUri}\ntitle: ""\nalt: ""\n:::\n`
  view.dispatch({ changes: { from: pos, to: pos, insert: block } })
  view.focus()
}

/** Handle image files from drop or paste events */
async function handleImageFiles(view: EditorView, files: FileList | File[]) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const dataUri = await imageToWebpBase64(file)
    insertImageBlock(view, dataUri)
  }
}

/** CodeMirror DOM event handlers for drag-drop and paste of images */
const imageDropPaste = EditorView.domEventHandlers({
  drop(event, view) {
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return false
    const hasImage = Array.from(files).some((f) => f.type.startsWith('image/'))
    if (!hasImage) return false
    event.preventDefault()
    // Move cursor to drop position
    const dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (dropPos != null) {
      view.dispatch({ selection: { anchor: dropPos } })
    }
    handleImageFiles(view, files)
    return true
  },
  paste(event, view) {
    const items = event.clipboardData?.items
    if (!items) return false
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length === 0) return false
    event.preventDefault()
    handleImageFiles(view, imageFiles)
    return true
  },
})

export interface EdmEditorHandle {
  getScroller: () => HTMLElement | null
  getView: () => EditorView | null
}

export const EdmEditor = forwardRef<EdmEditorHandle>(function EdmEditor(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const source = useDocumentStore((s) => s.source)
  const setSource = useDocumentStore((s) => s.setSource)
  const setHtml = useDocumentStore((s) => s.setHtml)

  useImperativeHandle(ref, () => ({
    getScroller: () =>
      containerRef.current?.querySelector<HTMLElement>('.cm-scroller') ?? null,
    getView: () => viewRef.current,
  }))

  // Función para decodificar el fuente edm a HTML (async con debounce)
  // setSource se llama DENTRO del debounce para no disparar re-renders
  // en cada tecla (useSlides, useBookPagination, Panels escuchan source)
  const decodeSource = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSource(text)
        useDocumentStore.getState().markDirty()
        try {
          const html = await decodeAsync(text, { mode: 'teacher' })
          setHtml(html)
        } catch {
          setHtml('<p style="color: #f87171;">Error al parsear el documento.</p>')
        }
      }, 300)
    },
    [setSource, setHtml]
  )

  // Crear el editor
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newSource = update.state.doc.toString()
        decodeSource(newSource)
      }
    })

    const state = EditorState.create({
      doc: source,
      extensions: [
        lineNumbers(),
        commentFold,
        markdown(),
        oneDark,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        formattingKeymap,
        updateListener,
        sectionColors,
        blockNesting,
        codeHighlight,
        markdownHighlight,
        tableFormatter,
        svgEditWidget,
        svgEditWidgetTheme,
        mermaidZoomWidget,
        mermaidZoomWidgetTheme,
        mermaidEditWidget,
        mermaidEditWidgetTheme,
        imagePreviewWidget,
        imagePreviewWidgetTheme,
        imageDropPaste,
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    // Decodificar el contenido inicial
    if (source) decodeSource(source)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      view.destroy()
      viewRef.current = null
    }
    // Solo se ejecuta al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincronizar cuando el source cambia externamente (ej: cargar archivo, metadata update)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== source) {
      // Preservar posición del cursor (ajustada al nuevo largo)
      const cursor = view.state.selection.main.head
      const anchor = Math.min(cursor, source.length)
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: source },
        selection: { anchor },
      })
      decodeSource(source)
    }
  }, [source, decodeSource])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden" />
  )
})
