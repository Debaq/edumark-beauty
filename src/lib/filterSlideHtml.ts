import type { FreeTextMode } from '@/types/contentMode'

/** Tags that are always kept (headings = slide titles) */
const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR'])

/** Check if an element is an edm pedagogical block */
function isEdmBlock(el: Element): boolean {
  return el.className && /\bedm-/.test(el.className)
}

/**
 * Filter slide HTML based on freeTextMode.
 * - 'show': return html as-is
 * - 'hide': remove free text (keep headings + edm blocks)
 * - 'notes': remove free text from html, return it as notes
 *
 * "Free text" = any top-level element that is NOT a heading and NOT an edm block.
 */
export function filterSlideHtml(
  html: string,
  mode: FreeTextMode,
): { html: string; notes?: string } {
  if (mode === 'show') return { html }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild!

  const kept: string[] = []
  const removed: string[] = []

  for (const child of Array.from(root.children)) {
    const el = child as HTMLElement
    if (el.tagName === 'STYLE' || el.tagName === 'LINK') {
      kept.push(el.outerHTML)
      continue
    }

    const isHeading = HEADING_TAGS.has(el.tagName)
    const isBlock = isEdmBlock(el)

    if (isHeading || isBlock) {
      kept.push(el.outerHTML)
    } else {
      removed.push(el.outerHTML)
    }
  }

  return {
    html: kept.join(''),
    notes: mode === 'notes' && removed.length > 0 ? removed.join('') : undefined,
  }
}
