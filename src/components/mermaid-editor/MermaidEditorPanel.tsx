import { useState, useEffect, useRef, useCallback } from 'react'
import mermaid from 'mermaid'
import { useUIStore } from '@/store/ui'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { replaceDiagramMermaid } from '@/lib/mermaidSourcePatch'
import { MermaidToolbar } from './MermaidToolbar'
import '@/styles/mermaid-editor.css'

let mermaidIdCounter = 0

function isDark(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5
}

export function MermaidEditorPanel() {
  const diagramId = useUIStore((s) => s.mermaidEditorDiagramId)
  const originalCode = useUIStore((s) => s.mermaidEditorOriginalCode)
  const closeMermaidEditor = useUIStore((s) => s.closeMermaidEditor)
  const addToast = useUIStore((s) => s.addToast)
  const theme = useThemeStore((s) => s.config)

  const [code, setCode] = useState(originalCode ?? '')
  const [svgHtml, setSvgHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const hasChanges = code !== (originalCode ?? '')

  // Render mermaid on code change (debounced)
  useEffect(() => {
    clearTimeout(renderTimerRef.current)
    renderTimerRef.current = setTimeout(async () => {
      const trimmed = code.trim()
      if (!trimmed) {
        setSvgHtml('')
        setError(null)
        return
      }

      const dark = isDark(theme.bg)
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: dark ? theme.accent + '30' : theme.accent + '18',
          primaryTextColor: theme.fg,
          primaryBorderColor: theme.accentBorder,
          lineColor: theme.fg2,
          secondaryColor: dark ? theme.blue + '25' : theme.blue + '14',
          tertiaryColor: dark ? theme.green + '25' : theme.green + '14',
          background: 'transparent',
          mainBkg: theme.bg1,
          textColor: theme.fg,
          nodeBorder: theme.border,
          clusterBkg: theme.bg2,
          clusterBorder: theme.border,
          titleColor: theme.fg,
          edgeLabelBackground: theme.bg,
          nodeTextColor: theme.fg,
          fontFamily: theme.bodyFont,
          fontSize: '14px',
        },
        darkMode: dark,
        fontFamily: theme.bodyFont,
        securityLevel: 'loose',
      })

      const id = `edm-mermaid-editor-${++mermaidIdCounter}`
      try {
        const processed = trimmed.replace(/\\n/g, '<br/>')
        const { svg } = await mermaid.render(id, processed)
        setSvgHtml(svg)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de sintaxis')
        // Keep last valid SVG
      }
    }, 300)

    return () => clearTimeout(renderTimerRef.current)
  }, [code, theme])

  // Handle save
  const handleSave = useCallback(() => {
    if (!diagramId) return

    const source = useDocumentStore.getState().source
    const newSource = replaceDiagramMermaid(source, diagramId, code.trim())

    if (newSource !== source) {
      useDocumentStore.getState().setSource(newSource)
      addToast('Diagrama Mermaid actualizado', 'success')
    } else {
      addToast('Sin cambios', 'info')
    }

    closeMermaidEditor()
  }, [diagramId, code, closeMermaidEditor, addToast])

  // Handle cancel
  const handleCancel = useCallback(() => {
    closeMermaidEditor()
  }, [closeMermaidEditor])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        handleCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave, handleCancel])

  // Tab key support in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const val = ta.value
      ta.value = val.substring(0, start) + '    ' + val.substring(end)
      ta.selectionStart = ta.selectionEnd = start + 4
      setCode(ta.value)
    }
  }, [])

  return (
    <div className="edm-mermaid-editor">
      <MermaidToolbar
        onSave={handleSave}
        onCancel={handleCancel}
        hasChanges={hasChanges}
      />

      <div className="edm-mermaid-editor-body">
        {/* Code editor */}
        <div className="edm-mermaid-code-panel">
          <textarea
            ref={textareaRef}
            className="edm-mermaid-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoFocus
          />
        </div>

        {/* Preview */}
        <div className="edm-mermaid-preview-panel">
          {error && (
            <div className="edm-mermaid-error">{error}</div>
          )}
          <div
            ref={previewRef}
            className="edm-mermaid-preview-content"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </div>
      </div>
    </div>
  )
}
