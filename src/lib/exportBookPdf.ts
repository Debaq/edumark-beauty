import type { ThemeConfig } from '@/types/theme'
import type { PageConfig } from '@/types/contentMode'
import type { BookLayoutConfig, PageLayout } from '@/types/bookLayout'
import { exportFullHtml } from './exportHtml'

const LAYOUT_CSS: Record<PageLayout, string> = {
  'stack': 'grid-template-columns: 1fr;',
  'two-columns': 'grid-template-columns: 1fr 1fr;',
  'grid-2x2': 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;',
  'sidebar-left': 'grid-template-columns: 1fr 2fr;',
  'sidebar-right': 'grid-template-columns: 2fr 1fr;',
}

/**
 * Exports book mode as PDF with configurable page size and margins.
 * If a BookLayoutConfig is provided, applies grid layouts and free positioning.
 */
export async function exportBookPdf(
  html: string,
  theme: ThemeConfig,
  pageConfig: PageConfig,
  filename: string,
  bookLayout?: BookLayoutConfig | null,
): Promise<void> {
  const html2pdfModule = await import('html2pdf.js')
  const html2pdf = html2pdfModule.default

  let contentHtml: string

  if (bookLayout?.isManual) {
    // Build pages with layout applied
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
    const root = doc.body.firstElementChild!
    const nodeMap = new Map<string, string>()

    // Build map of nodeId -> outerHTML
    let ordinal = 0
    for (const child of Array.from(root.children)) {
      const el = child as HTMLElement
      if (el.tagName === 'STYLE' || el.tagName === 'LINK') continue
      const id = el.getAttribute('id') || `node-${ordinal}`
      nodeMap.set(id, el.outerHTML)
      ordinal++
    }

    const pagesHtml = bookLayout.pages.map((pageConf) => {
      const gridBlocks: string[] = []
      const freeBlocks: string[] = []

      for (const blockId of pageConf.blockIds) {
        const blockHtml = nodeMap.get(blockId)
        if (!blockHtml) continue
        const props = pageConf.blockProps[blockId]

        if (props?.positioning === 'free') {
          const x = props.x ?? 0
          const y = props.y ?? 0
          const w = props.width ? `width:${props.width}mm;` : ''
          const h = props.height ? `height:${props.height}mm;` : ''
          freeBlocks.push(
            `<div style="position:absolute;left:${x}mm;top:${y}mm;${w}${h}">${blockHtml}</div>`
          )
        } else {
          const span = props?.gridSpan ? `grid-column:span ${props.gridSpan};` : ''
          const order = props?.order != null ? `order:${props.order};` : ''
          gridBlocks.push(
            `<div style="${span}${order}">${blockHtml}</div>`
          )
        }
      }

      const layoutCss = LAYOUT_CSS[pageConf.layout] || LAYOUT_CSS.stack
      return `<div style="display:grid;${layoutCss}gap:0;align-content:start;position:relative;">${gridBlocks.join('')}${freeBlocks.join('')}</div>`
    })

    contentHtml = pagesHtml.join('<div style="page-break-after:always;"></div>')
  } else {
    contentHtml = html
  }

  const fullHtml = exportFullHtml(contentHtml, theme, filename)
  const container = document.createElement('div')
  container.innerHTML = fullHtml
  document.body.appendChild(container)

  const previewEl = container.querySelector('.edm-preview') || container

  // Book PDF: expand all <details> so solutions are visible in print
  previewEl.querySelectorAll('details:not([open])').forEach((d) => d.setAttribute('open', ''))

  await html2pdf()
    .set({
      margin: [
        pageConfig.margins.top,
        pageConfig.margins.right,
        pageConfig.margins.bottom,
        pageConfig.margins.left,
      ],
      filename: filename.replace(/\.edm$/, '') + '_libro.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: 'mm',
        format: [pageConfig.width, pageConfig.height],
        orientation: 'portrait' as const,
      },
    })
    .from(previewEl as HTMLElement)
    .save()

  document.body.removeChild(container)
}
