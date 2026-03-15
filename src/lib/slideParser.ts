import type { SlideTemplate } from '@/types/contentMode'

export interface SlideRaw {
  /** Full segment source including metadata comment */
  source: string
  /** Source without metadata comment (for rendering) */
  content: string
  /** Resolved template: metadata > auto-detect */
  template: SlideTemplate
  /** Raw key-value pairs from <!-- slide: ... --> comment */
  metadata: Record<string, string>
}

const SLIDE_META_RE = /^<!--\s*slide:\s*(.+?)\s*-->$/


const VALID_TEMPLATES: Set<string> = new Set([
  'cover', 'content', 'two-columns', 'image-text', 'full-media',
])

// ── Metadata parsing ──

function parseMetadataLine(line: string): Record<string, string> | null {
  const match = line.trim().match(SLIDE_META_RE)
  if (!match) return null

  const meta: Record<string, string> = {}
  const pairs = match[1].split(/\s*,\s*/)
  for (const pair of pairs) {
    const eq = pair.indexOf('=')
    if (eq > 0) {
      const key = pair.slice(0, eq).trim()
      const val = pair.slice(eq + 1).trim()
      if (key) meta[key] = val
    }
  }
  return meta
}

function serializeMetadata(meta: Record<string, string>): string {
  const pairs = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${v}`)
  return `<!-- slide: ${pairs.join(', ')} -->`
}

/**
 * Extract metadata comment from the beginning of a segment.
 * Returns the metadata and the content without the comment.
 */
function extractMetadata(segSource: string): {
  metadata: Record<string, string>
  content: string
} {
  const lines = segSource.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.length === 0) continue

    const meta = parseMetadataLine(trimmed)
    if (meta) {
      const contentLines = [...lines.slice(0, i), ...lines.slice(i + 1)]
      return { metadata: meta, content: contentLines.join('\n') }
    }
    break // First non-blank line is not metadata
  }
  return { metadata: {}, content: segSource }
}

// ── Frontmatter detection ──

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

// ── Separator detection ──

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

// ── Slide parsing ──

/**
 * Split source text into slides separated by `---`.
 * If YAML frontmatter exists, it becomes its own slide (the cover).
 * The closing `---` of the frontmatter acts as the first slide boundary.
 * Empty segments are discarded.
 *
 * Each slide's `<!-- slide: key=value -->` comment is parsed as metadata.
 * The `content` field has the comment stripped for clean rendering.
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
    .map((segSource, i) => {
      const { metadata, content } = extractMetadata(segSource)
      const metaTemplate = metadata.template
      const resolvedTemplate = (metaTemplate && VALID_TEMPLATES.has(metaTemplate))
        ? metaTemplate as SlideTemplate
        : detectTemplate(content, i === 0 && hasFrontmatter, fmTitle)

      return {
        source: segSource,
        content,
        template: resolvedTemplate,
        metadata,
      }
    })
}

// ── Source update ──

/**
 * Update metadata for a specific slide in the source text.
 * Returns the new source with the `<!-- slide: ... -->` comment inserted or updated.
 *
 * Pass `undefined` as a value to remove that key.
 * If all keys are removed, the comment is deleted entirely.
 */
export function updateSlideMetadataInSource(
  source: string,
  slideIndex: number,
  updates: Record<string, string | undefined>,
): string {
  const lines = source.split('\n')
  const fmEnd = detectFrontmatterEnd(lines)
  const separators = findSeparatorLines(source)

  // Build segment line ranges: [start, end)
  const segRanges: [number, number][] = []
  let start = 0

  if (fmEnd > 0) {
    segRanges.push([0, fmEnd])
    start = fmEnd
  }

  for (const sep of separators) {
    if (sep < start) continue
    const segText = lines.slice(start, sep).join('\n').trim()
    if (segText.length > 0) {
      segRanges.push([start, sep])
    }
    start = sep + 1
  }
  // Last segment
  const lastText = lines.slice(start).join('\n').trim()
  if (lastText.length > 0) {
    segRanges.push([start, lines.length])
  }

  if (slideIndex < 0 || slideIndex >= segRanges.length) return source

  // Don't modify frontmatter slides — they have their own config
  if (fmEnd > 0 && slideIndex === 0) return source

  const [segStart, segEnd] = segRanges[slideIndex]

  // Find existing metadata comment (first non-blank line)
  let metaLineIdx = -1
  let firstContentIdx = -1
  for (let i = segStart; i < segEnd; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.length === 0) continue
    if (firstContentIdx === -1) firstContentIdx = i
    if (SLIDE_META_RE.test(trimmed)) metaLineIdx = i
    break
  }

  // Parse existing metadata
  let existingMeta: Record<string, string> = {}
  if (metaLineIdx >= 0) {
    existingMeta = parseMetadataLine(lines[metaLineIdx]) ?? {}
  }

  // Merge updates
  const newMeta: Record<string, string> = { ...existingMeta }
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) {
      delete newMeta[k]
    } else {
      newMeta[k] = v
    }
  }

  const hasValues = Object.keys(newMeta).length > 0

  if (metaLineIdx >= 0) {
    if (hasValues) {
      lines[metaLineIdx] = serializeMetadata(newMeta)
    } else {
      lines.splice(metaLineIdx, 1)
    }
  } else if (hasValues) {
    const insertAt = firstContentIdx >= 0 ? firstContentIdx : segStart
    lines.splice(insertAt, 0, serializeMetadata(newMeta))
  }

  return lines.join('\n')
}

// ── Template auto-detection ──

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
