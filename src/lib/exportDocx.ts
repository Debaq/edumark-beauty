import { saveAs } from 'file-saver'

/**
 * Genera un archivo .docx a partir del HTML renderizado
 */
export async function exportDocx(html: string, filename: string): Promise<void> {
  const htmlToDocx = await import('html-to-docx')
  const convert = htmlToDocx.default || htmlToDocx

  // Envolver en HTML básico para el conversor
  const wrappedHtml = `
    <html>
      <body>
        ${html}
      </body>
    </html>
  `

  const blob = await convert(wrappedHtml, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  })

  saveAs(blob as Blob, filename.replace(/\.edm$/, '') + '.docx')
}
