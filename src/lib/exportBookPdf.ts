import type { ThemeConfig } from '@/types/theme'
import type { PageConfig } from '@/types/contentMode'
import type { BookLayoutConfig, PageLayout } from '@/types/bookLayout'
import { exportFullHtml } from './exportHtml'
import { replaceEmbedsForPrint } from './embedToPrint'

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

    const docBg = bookLayout.backgroundColor

    const pagesHtml = bookLayout.pages.map((pageConf) => {
      const blocks: string[] = []

      for (const blockId of pageConf.blockIds) {
        const blockHtml = nodeMap.get(blockId)
        if (!blockHtml) continue
        const props = pageConf.blockProps[blockId]
        const styles: string[] = []
        if (props?.fullWidth) styles.push('column-span:all;')
        if (props?.order != null) styles.push(`order:${props.order};`)
        if (props?.marginTop) styles.push(`margin-top:${props.marginTop}px;`)
        if (props?.marginBottom) styles.push(`margin-bottom:${props.marginBottom}px;`)
        if (props?.backgroundColor) styles.push(`background-color:${props.backgroundColor};`)
        if (props?.padding) styles.push(`padding:${props.padding}px;`)
        if (props?.borderRadius) styles.push(`border-radius:${props.borderRadius}px;`)
        if (props?.borderColor && props?.borderWidth) styles.push(`border:${props.borderWidth}px solid ${props.borderColor};`)
        if (props?.shadow) styles.push('box-shadow:0 2px 8px rgba(0,0,0,0.12);')
        if (/class="[^"]*edm-/.test(blockHtml)) styles.push('break-inside:avoid;')
        const styleAttr = styles.length ? ` style="${styles.join('')}"` : ''
        blocks.push(`<div${styleAttr}>${blockHtml}</div>`)
      }

      const layoutCss = getLayoutCss(pageConf.layout, bookLayout.columnGap ?? 24)
      const pageBg = pageConf.backgroundColor ?? docBg
      const pageBgCss = pageBg ? `background-color:${pageBg};` : ''
      return `<div style="${layoutCss}${pageBgCss}">${blocks.join('')}</div>`
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

  // Replace embed iframes with QR codes for print
  await replaceEmbedsForPrint(previewEl as HTMLElement)

  // Calcular números de página para :::include links
  fillIncludePageNumbers(
    previewEl as HTMLElement,
    pageConfig.height,
    pageConfig.margins.top,
    pageConfig.margins.bottom,
  )

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

/**
 * Llena los spans .edm-include-page con el número de página estimado
 * del elemento target, basándose en la posición Y en el DOM offscreen.
 */
function fillIncludePageNumbers(
  root: HTMLElement,
  pageHeightMm: number,
  marginTopMm: number,
  marginBottomMm: number,
): void {
  const MM_TO_PX = 96 / 25.4 // 3.7795...
  const contentHeightPx = (pageHeightMm - marginTopMm - marginBottomMm) * MM_TO_PX

  if (contentHeightPx <= 0) return

  const pageSpans = root.querySelectorAll<HTMLElement>('.edm-include-page[data-target]')
  for (const span of pageSpans) {
    const targetId = span.getAttribute('data-target')!
    const target = root.querySelector(`#${CSS.escape(targetId)}`)
    if (target) {
      const el = target as HTMLElement
      const page = Math.floor(el.offsetTop / contentHeightPx) + 1
      span.textContent = `p. ${page}`
    }
  }
}
