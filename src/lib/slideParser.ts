import type { SlideTemplate } from '@/types/contentMode'

export interface SlideRaw {
  source: string
  template: SlideTemplate
}

/**
 * Detect YAML frontmatter at the start of source.
 * Returns the line index AFTER the closing `---`, or 0 if no frontmatter.
 * Skips leading blank lines before the opening `---`.
 */
function detectFrontmatterEnd(lines: string[]): number {
  // Skip leading blank lines
  let openLine = 0
  while (openLine < lines.length && lines[openLine].trim().length === 0) openLine++

  if (openLine >= lines.length || lines[openLine].trim() !== '---') return 0

  let hasYamlKey = false
  for (let i = openLine + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (trimmed === '---') {
      // Only valid frontmatter if we found at least one key: value line
      return hasYamlKey ? i + 1 : 0
    }

    // Empty lines are OK inside frontmatter
    if (trimmed.length === 0) continue

    // YAML key: value
    if (/^[\w-]+\s*:/.test(trimmed)) {
      hasYamlKey = true
      continue
    }

    // YAML list item (under a key)
    if (trimmed.startsWith('- ') || trimmed === '-') continue

    // Indented continuation value
    if (/^\s+/.test(lines[i]) && hasYamlKey) continue

    // Not YAML — abort
    return 0
  }

  return 0 // never found closing ---
}

/**
 * Get all slide boundary lines (0-based): frontmatter end + `---` separators.
 * These are the lines where one slide ends and another begins.
 */
export function findSlideBoundaries(source: string): number[] {
  const lines = source.split('\n')
  const fmEnd = detectFrontmatterEnd(lines)
  const seps = findSeparatorLines(source)

  const boundaries: number[] = []
  // Frontmatter end is a boundary (the closing --- line of frontmatter)
  if (fmEnd > 0) boundaries.push(fmEnd - 1)
  for (const sep of seps) {
    if (fmEnd > 0 && sep < fmEnd) continue
    boundaries.push(sep)
  }
  return boundaries
}

/**
 * Find line numbers (0-based) of `---` separators in source text.
 * Ignores `---` inside code fences, directive blocks, and YAML frontmatter.
 */
export function findSeparatorLines(source: string): number[] {
  const lines = source.split('\n')
  const fmEnd = detectFrontmatterEnd(lines)
  const separators: number[] = []
  let inFence = false
  let blockDepth = 0

  for (let i = fmEnd; i < lines.length; i++) {
    const line = lines[i]

    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    if (/^:{3,}\s*\S+/.test(line)) {
      blockDepth++
      continue
    }
    if (/^:{3,}\s*$/.test(line)) {
      blockDepth = Math.max(0, blockDepth - 1)
      continue
    }
    if (blockDepth > 0) continue

    if (/^\s*---\s*$/.test(line)) {
      separators.push(i)
    }
  }

  return separators
}

/**
 * Split source text into slides separated by `---`.
 * If YAML frontmatter exists, it becomes its own slide (the cover).
 * The closing `---` of the frontmatter acts as the first slide boundary.
 * Empty segments are discarded.
 */
export function parseSlides(source: string): SlideRaw[] {
  const lines = source.split('\n')
  const fmEnd = detectFrontmatterEnd(lines)
  const separators = findSeparatorLines(source)

  const segments: string[] = []
  let start = 0

  // If frontmatter exists, it's the first segment on its own
  if (fmEnd > 0) {
    segments.push(lines.slice(0, fmEnd).join('\n'))
    start = fmEnd
  }

  // Rest split by --- separators
  for (const sep of separators) {
    if (sep < start) continue // skip separators inside frontmatter range
    segments.push(lines.slice(start, sep).join('\n'))
    start = sep + 1
  }
  segments.push(lines.slice(start).join('\n'))

  // Extract title from frontmatter for template detection
  const hasFrontmatter = fmEnd > 0
  let fmTitle = ''
  if (hasFrontmatter) {
    for (let i = 1; i < fmEnd - 1; i++) {
      const match = lines[i].match(/^title\s*:\s*["']?(.+?)["']?\s*$/)
      if (match) { fmTitle = match[1]; break }
    }
  }

  return segments
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((segSource, i) => ({
      source: segSource,
      template: detectTemplate(segSource, i === 0 && hasFrontmatter, fmTitle),
    }))
}

/** Auto-detect slide template based on content */
function detectTemplate(
  source: string,
  isFirstWithFrontmatter: boolean,
  fmTitle: string,
): SlideTemplate {
  // First slide with frontmatter that has a title → cover
  if (isFirstWithFrontmatter && fmTitle) {
    return 'cover'
  }

  const lines = source.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return 'content'

  const hasHeadingOnly = lines.every(
    (l) => /^#{1,3}\s/.test(l) || l.trim().length === 0
  )
  if (hasHeadingOnly && lines.some((l) => /^#{1,2}\s/.test(l))) {
    return 'cover'
  }

  const hasImage = lines.some(
    (l) => /!\[.*\]\(.*\)/.test(l) || /^```(mermaid|dot|plantuml|ditaa)/.test(l)
  )
  const hasText = lines.some(
    (l) => !(/^#{1,6}\s/.test(l) || /!\[.*\]\(.*\)/.test(l) || /^```/.test(l) || l.trim().length === 0)
  )

  if (hasImage && !hasText) return 'full-media'
  if (hasImage && hasText) return 'image-text'

  return 'content'
}
