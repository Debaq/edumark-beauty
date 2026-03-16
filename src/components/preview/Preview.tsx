import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { useQuestionInteractivity } from '@/hooks/useQuestionInteractivity'
import { useMermaid } from '@/hooks/useMermaid'
import { useIncludeLinks } from '@/hooks/useIncludeLinks'
import { generateThemeCss } from './previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityCss } from '@/lib/interactivity'

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

  // Interactividad de preguntas
  useQuestionInteractivity(containerRef, html)

  // Renderizar diagramas Mermaid
  useMermaid(containerRef, html, themeConfig)

  // Navegar a capítulos al hacer clic en :::include links
  useIncludeLinks(containerRef, html)

  if (!html) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--app-fg3)]">
        <p className="text-sm">La vista previa aparecera aqui...</p>
      </div>
    )
  }

  return (
    <div ref={scrollerRef} className="h-full overflow-auto" style={{ background: themeConfig.bg }}>
      <style>{previewBaseCss}{interactivityCss}</style>
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
