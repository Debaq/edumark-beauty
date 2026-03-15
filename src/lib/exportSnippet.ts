/**
 * Copia el HTML del contenido al portapapeles.
 */
export async function copyHtmlSnippet(html: string): Promise<void> {
  await navigator.clipboard.writeText(html)
}
