import type { ThemeConfig } from '@/types/theme'
import type { PageConfig } from '@/types/contentMode'
import type { BookLayoutConfig, PageLayout } from '@/types/bookLayout'
import { exportFullHtml } from './exportHtml'

function getLayoutCss(layout: PageLayout, columnGap: number): string {
  if (layout === 'two-columns') return `column-count:2;column-gap:${columnGap}px;`
  return ''
}

/**
 * Exports book mode as PDF with configurable page size and margins.
 * If a BookLayoutConfig is provided, applies column layouts.
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
      const blocks: string[] = []

      for (const blockId of pageConf.blockIds) {
        const blockHtml = nodeMap.get(blockId)
        if (!blockHtml) continue
        const props = pageConf.blockProps[blockId]
        const styles: string[] = []
        if (props?.fullWidth) styles.push('column-span:all;')
        if (props?.order != null) styles.push(`order:${props.order};`)
        // Edm blocks avoid breaking across columns
        if (/class="[^"]*edm-/.test(blockHtml)) styles.push('break-inside:avoid;')
        const styleAttr = styles.length ? ` style="${styles.join('')}"` : ''
        blocks.push(`<div${styleAttr}>${blockHtml}</div>`)
      }

      const layoutCss = getLayoutCss(pageConf.layout, bookLayout.columnGap ?? 24)
      return `<div style="${layoutCss}">${blocks.join('')}</div>`
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
