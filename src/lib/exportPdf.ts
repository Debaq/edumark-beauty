import type { ThemeConfig } from '@/types/theme'
import { exportFullHtml } from './exportHtml'
import { replaceEmbedsForPrint } from './embedToPrint'

/**
 * Genera un PDF a partir del HTML renderizado usando html2pdf.js
 */
export async function exportPdf(
  html: string,
  theme: ThemeConfig,
  filename: string
): Promise<void> {
  // Importar html2pdf dinámicamente
  const html2pdfModule = await import('html2pdf.js')
  const html2pdf = html2pdfModule.default

  // Crear un contenedor temporal con el HTML completo
  const fullHtml = exportFullHtml(html, theme, filename)
  const container = document.createElement('div')
  container.innerHTML = fullHtml
  document.body.appendChild(container)

  // Buscar el .edm-preview dentro del container
  const previewEl = container.querySelector('.edm-preview') || container

  // Replace embed iframes with QR codes for print
  await replaceEmbedsForPrint(previewEl as HTMLElement)

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: filename.replace(/\.edm$/, '') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(previewEl as HTMLElement)
    .save()

  document.body.removeChild(container)
}
