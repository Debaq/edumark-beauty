import type { ThemeConfig } from '@/types/theme'
import type { Slide, SlideConfig } from '@/types/contentMode'
import { exportPresentationHtml } from './exportPresentation'

/**
 * Exports presentation slides as a PDF using html2pdf.js.
 * Each slide gets its own page with page-break-after.
 */
export async function exportPresentationPdf(
  slides: Slide[],
  theme: ThemeConfig,
  slideConfig: SlideConfig,
  filename: string
): Promise<void> {
  const html2pdfModule = await import('html2pdf.js')
  const html2pdf = html2pdfModule.default

  // Determine orientation based on ratio
  const isWide = slideConfig.ratio !== '4:3'
  const orientation = isWide ? 'landscape' : 'landscape'

  // Create a temporary container with all slides visible
  const container = document.createElement('div')
  const fullHtml = exportPresentationHtml(slides, theme, filename)
  container.innerHTML = fullHtml

  // Override styles for PDF: show all slides stacked with page breaks
  const style = document.createElement('style')
  style.textContent = `
    body { overflow: visible !important; }
    .slide-container { width: auto; height: auto; position: static; }
    .slide {
      position: relative !important;
      display: flex !important;
      width: 100% !important;
      aspect-ratio: ${isWide ? '16/9' : '4/3'};
      page-break-after: always;
      break-after: page;
    }
    .slide-nav { display: none !important; }
  `
  container.querySelector('head')?.appendChild(style)
  document.body.appendChild(container)

  const contentEl = container.querySelector('.slide-container') || container

  await html2pdf()
    .set({
      margin: 0,
      filename: filename.replace(/\.edm$/, '') + '_presentacion.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation },
    })
    .from(contentEl as HTMLElement)
    .save()

  document.body.removeChild(container)
}
