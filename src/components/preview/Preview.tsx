import { useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { generateThemeCss } from './previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import katex from 'katex'

export interface PreviewHandle {
  getScroller: () => HTMLElement | null
}

export const Preview = forwardRef<PreviewHandle>(function Preview(_, ref) {
  const html = useDocumentStore((s) => s.html)
  const themeConfig = useThemeStore((s) => s.config)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    getScroller: () => scrollerRef.current,
  }))

  // Generar CSS del tema como custom properties
  const themeCssVars = useMemo(() => generateThemeCss(themeConfig), [themeConfig])

  // Renderizar KaTeX en elementos con data-math tras cada cambio de HTML
  useEffect(() => {
    if (!containerRef.current) return
    const mathElements = containerRef.current.querySelectorAll('[data-math]')
    mathElements.forEach((el) => {
      const tex = el.getAttribute('data-math') || el.textContent || ''
      const displayMode = el.tagName === 'DIV' || el.classList.contains('katex-display')
      try {
        el.innerHTML = katex.renderToString(tex, {
          displayMode,
          throwOnError: false,
          output: 'html',
        })
      } catch {
        // Dejar el texto original si falla
      }
    })
  }, [html])

  // Renderizar diagramas Mermaid
  useEffect(() => {
    if (!containerRef.current) return
    const mermaidBlocks = containerRef.current.querySelectorAll('pre.mermaid, code.language-mermaid')
    if (mermaidBlocks.length === 0) return

    // Importar mermaid de forma dinámica
    import('mermaid').then((mermaidModule) => {
      const mermaid = mermaidModule.default
      mermaid.initialize({
        startOnLoad: false,
        theme: themeConfig.bg === '#ffffff' || themeConfig.bg === '#f5f0e8' ? 'default' : 'dark',
      })

      mermaidBlocks.forEach(async (el, i) => {
        const code = el.textContent || ''
        try {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}-${i}`, code)
          const wrapper = document.createElement('div')
          wrapper.className = 'edm-diagram'
          wrapper.innerHTML = svg
          el.replaceWith(wrapper)
        } catch {
          // Dejar el bloque de código si falla
        }
      })
    })
  }, [html, themeConfig.bg])

  if (!html) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--app-fg3)]">
        <p className="text-sm">La vista previa aparecera aqui...</p>
      </div>
    )
  }

  return (
    <div ref={scrollerRef} className="h-full overflow-auto" style={{ background: themeConfig.bg }}>
      <style>{previewBaseCss}</style>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <div
        ref={containerRef}
        className="edm-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`.edm-preview { ${themeCssVars} }`}</style>
      {themeConfig.customCss && <style>{themeConfig.customCss}</style>}
    </div>
  )
})
