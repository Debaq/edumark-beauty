import type { ThemeConfig } from '@/types/theme'
import type { ContentMode } from '@/types/contentMode'

const TAG = 'edumark-beauty'
const BLOCK_RE = /^<!-- edumark-beauty\n([\s\S]*?)\n-->\n?/

/** Theme data for a single content mode. */
export interface ModeThemeData {
  preset?: string
  config?: ThemeConfig
}

/** Parsed theme block: one entry per content mode. */
export type ThemeBlockData = Record<ContentMode, ModeThemeData>

/* ── helpers ─────────────────────────────────────────────────── */

function parseMode(data: unknown): ModeThemeData {
  if (!data || typeof data !== 'object') return {}
  const d = data as Record<string, unknown>
  if (typeof d.preset === 'string') return { preset: d.preset }
  return { config: d as unknown as ThemeConfig }
}

/* ── public API ──────────────────────────────────────────────── */

/** Parse the theme block from the beginning of a source string. */
export function parseThemeBlock(source: string): ThemeBlockData | null {
  const match = source.match(BLOCK_RE)
  if (!match) return null
  try {
    const data = JSON.parse(match[1].trim())

    // New per-mode format: { html: {...}, presentation: {...}, book: {...} }
    if (data.html || data.presentation || data.book) {
      return {
        html: parseMode(data.html),
        presentation: parseMode(data.presentation),
        book: parseMode(data.book),
      }
    }

    // Legacy single-value format: { preset: "dark" } or full config
    const single: ModeThemeData = data.preset
      ? { preset: data.preset }
      : { config: data as ThemeConfig }
    return { html: { ...single }, presentation: { ...single }, book: { ...single } }
  } catch {
    return null
  }
}

/** Build the HTML comment block string. */
export function buildThemeBlock(
  modePresets: Record<ContentMode, string | null>,
  modeConfigs: Record<ContentMode, ThemeConfig>,
): string {
  const obj: Record<string, unknown> = {}
  for (const mode of ['html', 'presentation', 'book'] as ContentMode[]) {
    obj[mode] = modePresets[mode]
      ? { preset: modePresets[mode] }
      : modeConfigs[mode]
  }
  return `<!-- ${TAG}\n${JSON.stringify(obj, null, 2)}\n-->`
}

/**
 * Replace or insert the theme comment at the top of the source.
 * Returns the updated source string.
 */
export function updateThemeInSource(
  source: string,
  modePresets: Record<ContentMode, string | null>,
  modeConfigs: Record<ContentMode, ThemeConfig>,
): string {
  const block = buildThemeBlock(modePresets, modeConfigs)
  const match = source.match(BLOCK_RE)
  if (match) {
    return source.replace(BLOCK_RE, block + '\n')
  }
  return block + '\n' + source
}
