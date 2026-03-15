import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { useDocumentStore } from '@/store/document'
import { decodeAsync } from 'edumark-js'

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
  const decodeSource = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const html = await decodeAsync(text, { mode: 'teacher' })
          setHtml(html)
        } catch {
          setHtml('<p style="color: #f87171;">Error al parsear el documento.</p>')
        }
      }, 300)
    },
    [setHtml]
  )

  // Crear el editor
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newSource = update.state.doc.toString()
        setSource(newSource)
        decodeSource(newSource)
      }
    })

    const state = EditorState.create({
      doc: source,
      extensions: [
        markdown(),
        oneDark,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
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

  // Sincronizar cuando el source cambia externamente (ej: cargar archivo)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== source) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: source },
      })
      decodeSource(source)
    }
  }, [source, decodeSource])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden" />
  )
})
