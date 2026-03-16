import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { ThemeConfig } from '@/types/theme'

/** Decide si un color hex es oscuro (luminancia < 0.5) */
function isDark(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5
}

/** Mapea colores del ThemeConfig a themeVariables de Mermaid */
function buildMermaidVars(t: ThemeConfig) {
  const dark = isDark(t.bg)
  return {
    primaryColor: dark ? t.accent + '30' : t.accent + '18',
    primaryTextColor: t.fg,
    primaryBorderColor: t.accentBorder,
    lineColor: t.fg2,
    secondaryColor: dark ? t.blue + '25' : t.blue + '14',
    tertiaryColor: dark ? t.green + '25' : t.green + '14',
    background: 'transparent',
    mainBkg: t.bg1,
    textColor: t.fg,
    nodeBorder: t.border,
    clusterBkg: t.bg2,
    clusterBorder: t.border,
    titleColor: t.fg,
    edgeLabelBackground: t.bg,
    nodeTextColor: t.fg,
    fontFamily: t.bodyFont,
    fontSize: '14px',
  }
}

/** Clave simple para detectar cambios de tema relevantes para mermaid */
function themeKey(t: ThemeConfig): string {
  return `${t.bg}|${t.fg}|${t.accent}|${t.blue}|${t.border}|${t.bg1}|${t.bg2}|${t.fg2}`
}

let mermaidIdCounter = 0
const RASTER_SCALE = 2 // 2x for retina quality

/**
 * Rasterizes an SVG string to a PNG data URL via an offscreen canvas.
 * Returns { dataUrl, width, height } where width/height are the natural (1x) dimensions.
 */
function rasterizeSvg(svgString: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // Parse width/height from the SVG
    const wMatch = svgString.match(/width="([\d.]+)"/)
    const hMatch = svgString.match(/height="([\d.]+)"/)
    const width = wMatch ? parseFloat(wMatch[1]) : 800
    const height = hMatch ? parseFloat(hMatch[1]) : 600

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * RASTER_SCALE
      canvas.height = height * RASTER_SCALE
      const ctx = canvas.getContext('2d')!
      ctx.scale(RASTER_SCALE, RASTER_SCALE)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG for rasterization'))
    }

    img.src = url
  })
}

/**
 * Hook que renderiza bloques `<pre class="mermaid">` dentro de un contenedor.
 * Rasteriza el SVG a PNG para control total del tamaño.
 * Re-renderiza cuando cambia el HTML o los colores del tema.
 */
export function useMermaid(
  containerRef: React.RefObject<HTMLElement | null>,
  html: string,
  theme: ThemeConfig,
) {
  const prevKeyRef = useRef('')
  const prevHtmlRef = useRef('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const key = themeKey(theme)
    const htmlChanged = html !== prevHtmlRef.current
    const themeChanged = key !== prevKeyRef.current

    if (!htmlChanged && !themeChanged) return

    prevKeyRef.current = key
    prevHtmlRef.current = html

    // Si solo cambió el tema, restaurar los <pre> originales
    if (themeChanged && !htmlChanged) {
      const rendered = container.querySelectorAll<HTMLElement>('[data-mermaid-src]')
      rendered.forEach((el) => {
        const code = el.getAttribute('data-mermaid-src')!
        const pre = document.createElement('pre')
        pre.className = 'mermaid'
        pre.textContent = code
        el.replaceWith(pre)
      })
    }

    const pres = container.querySelectorAll<HTMLPreElement>('pre.mermaid')
    const krokiSvgs = container.querySelectorAll<SVGSVGElement>('.edm-diagram-render > .edm-mermaid-rendered > svg')

    if (pres.length === 0 && krokiSvgs.length === 0) return

    const dark = isDark(theme.bg)

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: buildMermaidVars(theme),
      darkMode: dark,
      fontFamily: theme.bodyFont,
      securityLevel: 'loose',
    })

    /** Build the rasterized img wrapped in a scrollable container if needed */
    function buildDiagramImg(
      dataUrl: string, width: number, height: number,
      zoom: number, containerWidth: number,
    ): HTMLElement {
      const img = document.createElement('img')
      img.src = dataUrl
      img.alt = 'Mermaid diagram'
      img.width = width
      img.height = height
      img.style.display = 'block'
      img.style.height = 'auto'

      const effectiveWidth = width * zoom
      // If diagram fits in container, scale to fill; otherwise show at natural size with scroll
      if (effectiveWidth <= containerWidth) {
        img.style.width = `${zoom * 100}%`
        img.style.maxWidth = `${zoom * 100}%`
        img.style.margin = '0 auto'
        return img
      } else {
        // Scrollable container for wide diagrams
        img.style.width = `${effectiveWidth}px`
        img.style.maxWidth = 'none'
        const scroller = document.createElement('div')
        scroller.className = 'edm-mermaid-scroll'
        scroller.appendChild(img)
        return scroller
      }
    }

    const render = async () => {
      const containerWidth = container.clientWidth || 800

      // 1. Rasterize SVGs already rendered by Kroki
      for (const svgEl of krokiSvgs) {
        const wrapper = svgEl.parentElement
        if (!wrapper || wrapper.hasAttribute('data-mermaid-src')) continue
        const diagramRender = wrapper.closest('.edm-diagram-render')
        const zoomVal = diagramRender?.getAttribute('data-edm-zoom')
        const zoom = zoomVal ? parseFloat(zoomVal) : 1
        wrapper.setAttribute('data-mermaid-src', '__kroki__')
        try {
          const svgString = new XMLSerializer().serializeToString(svgEl)
          const { dataUrl, width, height } = await rasterizeSvg(svgString)
          const content = buildDiagramImg(dataUrl, width, height, zoom, containerWidth)
          wrapper.innerHTML = ''
          wrapper.appendChild(content)
        } catch { /* leave SVG as-is */ }
      }

      // 2. Render <pre class="mermaid"> blocks (not processed by Kroki)
      for (const pre of pres) {
        const raw = pre.textContent?.trim()
        if (!raw) continue

        const code = raw.replace(/\\n/g, '<br/>')
        const id = `edm-mermaid-${++mermaidIdCounter}`
        const diagramRender = pre.closest('.edm-diagram-render')
        const zoomVal = diagramRender?.getAttribute('data-edm-zoom')
        const zoom = zoomVal ? parseFloat(zoomVal) : 1

        try {
          const { svg } = await mermaid.render(id, code)
          const { dataUrl, width, height } = await rasterizeSvg(svg)

          const wrapper = document.createElement('div')
          wrapper.className = 'edm-mermaid-rendered'
          wrapper.setAttribute('data-mermaid-src', raw)

          const content = buildDiagramImg(dataUrl, width, height, zoom, containerWidth)
          wrapper.appendChild(content)
          pre.replaceWith(wrapper)
        } catch {
          pre.classList.add('edm-mermaid-error')
        }
      }
    }

    const timer = setTimeout(render, 50)
    return () => clearTimeout(timer)
  }, [containerRef, html, theme])
}
