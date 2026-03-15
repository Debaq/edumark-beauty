import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { useContentModeStore } from '@/store/contentMode'
import { useQuestionInteractivity } from '@/hooks/useQuestionInteractivity'
import { generateThemeCss } from './previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityCss } from '@/lib/interactivity'
import '@/styles/book.css'

/** Convert mm to px at 96 DPI */
function mmToPx(mm: number): number {
  return Math.round(mm * 96 / 25.4)
}

/**
 * Walk top-level children of a container and group them into pages
 * based on available content height.
 */
function paginateNodes(
  container: HTMLElement,
  contentHeight: number
): string[][] {
  const pages: string[][] = []
  let currentPage: string[] = []
  let accumulatedHeight = 0

  const children = container.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement
    // Skip <style> and <link> elements
    if (child.tagName === 'STYLE' || child.tagName === 'LINK') continue

    const style = getComputedStyle(child)
    const marginTop = parseFloat(style.marginTop) || 0
    const marginBottom = parseFloat(style.marginBottom) || 0
    const totalHeight = child.offsetHeight + marginTop + marginBottom

    // If adding this element exceeds the page, start a new one
    // (unless the page is empty — always put at least one element per page)
    if (accumulatedHeight + totalHeight > contentHeight && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      accumulatedHeight = 0
    }

    currentPage.push(child.outerHTML)
    accumulatedHeight += totalHeight
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

export function BookPreview() {
  const html = useDocumentStore((s) => s.html)
  const themeConfig = useThemeStore((s) => s.config)
  const pageConfig = useContentModeStore((s) => s.pageConfig)

  const themeCssVars = useMemo(() => generateThemeCss(themeConfig), [themeConfig])

  const pageWidthPx = mmToPx(pageConfig.width)
  const pageHeightPx = mmToPx(pageConfig.height)
  const paddingTop = mmToPx(pageConfig.margins.top)
  const paddingBottom = mmToPx(pageConfig.margins.bottom)
  const paddingLeft = mmToPx(pageConfig.margins.left)
  const paddingRight = mmToPx(pageConfig.margins.right)
  const contentHeight = pageHeightPx - paddingTop - paddingBottom

  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[][]>([])

  // Book-mode theme: force white background, dark text
  const bookThemeCss = useMemo(() => {
    // Start with the full theme vars (keeps typography, card colors, etc.)
    let css = themeCssVars
    // Override backgrounds to white/light for printed book look
    css += `\n  --t-bg: #ffffff;`
    css += `\n  --t-bg1: #f8f9fa;`
    css += `\n  --t-bg2: #f0f1f3;`
    // Force dark text for readability on white
    css += `\n  --t-fg: #1a1a1a;`
    css += `\n  --t-fg1: #2d2d2d;`
    css += `\n  --t-fg2: #555555;`
    css += `\n  --t-fg3: #888888;`
    css += `\n  --t-border: #e0e0e0;`
    css += `\n  --t-border-hover: #cccccc;`
    css += `\n  --t-card-header-bg: #f5f5f5;`
    css += `\n  --t-table-head: #f5f5f5;`
    css += `\n  --t-row-hover: #fafafa;`
    css += `\n  --t-muted-soft: #f5f5f5;`
    return css
  }, [themeCssVars])

  const paginate = useCallback(() => {
    const el = measureRef.current
    if (!el || !html) return

    // Open all <details> — book mode shows solutions expanded
    el.querySelectorAll('details:not([open])').forEach((d) => d.setAttribute('open', ''))

    // Wait for fonts and images to settle
    requestAnimationFrame(() => {
      const result = paginateNodes(el, contentHeight)
      setPages(result)
    })
  }, [html, contentHeight])

  // Re-paginate when html or page config changes
  useEffect(() => {
    if (!html) {
      setPages([])
      return
    }
    // Small delay to let the hidden measure container render
    const timer = setTimeout(paginate, 100)
    return () => clearTimeout(timer)
  }, [html, paginate])

  // Interactividad de preguntas (scoped al contenedor del libro)
  const bookContainerRef = useRef<HTMLDivElement>(null)
  useQuestionInteractivity(bookContainerRef, html)

  if (!html) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--app-fg3)]">
        <p className="text-sm">La vista de libro aparecera aqui...</p>
      </div>
    )
  }

  return (
    <div ref={bookContainerRef} className="edm-book-container h-full overflow-auto">
      <style>{previewBaseCss}{interactivityCss}</style>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />

      {/* Hidden measurement container — same width, no height constraint */}
      <div
        ref={measureRef}
        className="edm-preview edm-book-measure"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: `${pageWidthPx - paddingLeft - paddingRight}px`,
          visibility: 'hidden',
          background: '#ffffff',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`.edm-book-measure { ${bookThemeCss} }`}</style>

      {/* Rendered pages */}
      <div className="edm-book-pages">
        {pages.map((pageContent, i) => (
          <div
            key={i}
            className="edm-book-page"
            style={{
              width: `${pageWidthPx}px`,
              height: `${pageHeightPx}px`,
              paddingTop: `${paddingTop}px`,
              paddingBottom: `${paddingBottom}px`,
              paddingLeft: `${paddingLeft}px`,
              paddingRight: `${paddingRight}px`,
            }}
          >
            <div
              className="edm-preview"
              dangerouslySetInnerHTML={{ __html: pageContent.join('\n') }}
            />
            <style>{`.edm-book-page .edm-preview { ${bookThemeCss} }`}</style>
            <div className="edm-book-page-number">{i + 1}</div>
          </div>
        ))}
      </div>

      {themeConfig.customCss && <style>{themeConfig.customCss}</style>}
    </div>
  )
}
