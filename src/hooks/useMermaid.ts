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

/**
 * Hook que renderiza bloques `<pre class="mermaid">` dentro de un contenedor.
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
    if (pres.length === 0) return

    const dark = isDark(theme.bg)

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: buildMermaidVars(theme),
      darkMode: dark,
      fontFamily: theme.bodyFont,
      securityLevel: 'loose',
    })

    // Renderizar cada bloque individualmente para control total
    const render = async () => {
      for (const pre of pres) {
        const raw = pre.textContent?.trim()
        if (!raw) continue

        // Convertir \n literal a <br/> para que Mermaid renderice saltos de línea
        const code = raw.replace(/\\n/g, '<br/>')
        const id = `edm-mermaid-${++mermaidIdCounter}`
        // Leer zoom ANTES de reemplazar el pre
          const diagramRender = pre.closest('.edm-diagram-render')
          const zoomVal = diagramRender?.getAttribute('data-edm-zoom')
          const zoom = zoomVal ? parseFloat(zoomVal) : 0

          try {
          const { svg } = await mermaid.render(id, code)
          const wrapper = document.createElement('div')
          wrapper.className = 'edm-mermaid-rendered'
          wrapper.setAttribute('data-mermaid-src', raw)
          wrapper.innerHTML = svg
          // Quitar width/height fijos del SVG para que CSS controle el tamaño
          const svgEl = wrapper.querySelector('svg')
          if (svgEl) {
            svgEl.removeAttribute('width')
            svgEl.style.height = 'auto'
            if (zoom > 0 && zoom !== 1) {
              svgEl.style.setProperty('width', `${zoom * 100}%`, 'important')
              svgEl.style.setProperty('max-width', `${zoom * 100}%`, 'important')
              if (zoom > 1 && diagramRender) {
                ;(diagramRender as HTMLElement).style.overflow = 'auto'
              }
            } else {
              svgEl.style.maxWidth = '100%'
              svgEl.style.width = '100%'
            }
          }
          pre.replaceWith(wrapper)
        } catch {
          // En caso de error de sintaxis, dejar el <pre> como está
          pre.classList.add('edm-mermaid-error')
        }
      }
    }

    // Dar tiempo a que el DOM se pinte tras dangerouslySetInnerHTML
    const timer = setTimeout(render, 50)
    return () => clearTimeout(timer)
  }, [containerRef, html, theme])
}
