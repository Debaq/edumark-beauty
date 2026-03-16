import type { BookLayoutConfig } from '@/types/bookLayout'

const TAG = 'book-layout'
const BLOCK_RE = /<!-- book-layout\n([\s\S]*?)\n-->\n?/

/**
 * Parse the book-layout comment from the source string.
 * Returns null if no valid block is found.
 */
export function parseBookLayout(source: string): BookLayoutConfig | null {
  const match = source.match(BLOCK_RE)
  if (!match) return null
  try {
    const data = JSON.parse(match[1].trim())
    if (!data.pages || !Array.isArray(data.pages)) return null
    const config: BookLayoutConfig = {
      isManual: data.isManual ?? true,
      pages: data.pages,
    }
    if (data.columnGap != null) config.columnGap = data.columnGap
    if (data.textAlign != null) config.textAlign = data.textAlign
    if (data.showHr != null) config.showHr = data.showHr
    if (data.backgroundColor != null) config.backgroundColor = data.backgroundColor
    return config
  } catch {
    return null
  }
}

/**
 * Build the HTML comment block string for a book layout config.
 */
export function buildBookLayoutBlock(config: BookLayoutConfig): string {
  const { isManual, pages, columnGap, textAlign, showHr, backgroundColor } = config
  const obj: Record<string, unknown> = { isManual, pages }
  if (columnGap != null) obj.columnGap = columnGap
  if (textAlign != null) obj.textAlign = textAlign
  if (showHr != null) obj.showHr = showHr
  if (backgroundColor != null) obj.backgroundColor = backgroundColor
  return `<!-- ${TAG}\n${JSON.stringify(obj)}\n-->`
}

/**
 * Replace or insert the book-layout comment in the source.
 * The comment is placed after the theme block (if present) or at the top.
 * Returns the updated source string.
 */
export function updateBookLayoutInSource(
  source: string,
  config: BookLayoutConfig,
): string {
  const block = buildBookLayoutBlock(config)
  const match = source.match(BLOCK_RE)
  if (match) {
    return source.replace(BLOCK_RE, block + '\n')
  }
  // Insert after the theme block if present, otherwise at top
  const themeRe = /^<!-- edumark-beauty\n[\s\S]*?\n-->\n?/
  const themeMatch = source.match(themeRe)
  if (themeMatch) {
    const insertPos = themeMatch.index! + themeMatch[0].length
    return source.slice(0, insertPos) + block + '\n' + source.slice(insertPos)
  }
  return block + '\n' + source
}

/**
 * Remove the book-layout comment from the source.
 */
export function removeBookLayoutFromSource(source: string): string {
  return source.replace(BLOCK_RE, '')
}
