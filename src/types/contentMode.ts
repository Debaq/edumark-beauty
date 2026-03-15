export type ContentMode = 'html' | 'presentation' | 'book'

export type SlideTemplate = 'cover' | 'content' | 'two-columns' | 'image-text' | 'full-media'

/** How free text (paragraphs, lists — not headings or :::blocks) is handled in slides */
export type FreeTextMode = 'show' | 'hide' | 'notes'

export interface PageConfig {
  /** Paper size name */
  paperSize: 'a4' | 'letter' | 'legal' | 'custom'
  /** Width in mm */
  width: number
  /** Height in mm */
  height: number
  /** Margins in mm */
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface SlideConfig {
  /** Aspect ratio */
  ratio: '16:9' | '4:3' | 'custom'
  /** Custom width (only when ratio is 'custom') */
  customWidth?: number
  /** Custom height (only when ratio is 'custom') */
  customHeight?: number
  /** How to handle free text in slides (default: 'show') */
  freeTextMode?: FreeTextMode
}

export interface Slide {
  /** Raw markdown source for this slide (includes metadata comment) */
  source: string
  /** Source without metadata comment (used for rendering) */
  content: string
  /** Rendered HTML (may have free text filtered out) */
  html: string
  /** Resolved template: metadata > auto-detect */
  template: SlideTemplate
  /** Raw key-value pairs from <!-- slide: ... --> comment */
  metadata: Record<string, string>
  /** Free text extracted as speaker notes (when freeTextMode='notes') */
  notes?: string
}

/** Paper size presets in mm */
export const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
  legal: { width: 216, height: 356 },
}
