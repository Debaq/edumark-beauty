export type PageLayout = 'stack' | 'two-columns'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface BlockProps {
  /** If true, block spans all columns (column-span: all) */
  fullWidth?: boolean
  /** Order within the page */
  order?: number
  /** Text alignment override for this block */
  textAlign?: TextAlign
}

export interface PageConfig {
  layout: PageLayout
  /** Block IDs in this page, in order */
  blockIds: string[]
  /** Per-block properties */
  blockProps: Record<string, BlockProps>
}

export interface BookLayoutConfig {
  /** true = the user has manually edited the layout */
  isManual: boolean
  pages: PageConfig[]
  /** Gap between columns in px (default 24) */
  columnGap?: number
  /** Default text alignment for the whole document */
  textAlign?: TextAlign
  /** Whether to show horizontal rules (---) in book mode (default false) */
  showHr?: boolean
}

export const DEFAULT_BLOCK_PROPS: BlockProps = {}

export const PAGE_LAYOUTS: { id: PageLayout; label: string }[] = [
  { id: 'stack', label: 'Una columna' },
  { id: 'two-columns', label: 'Dos columnas' },
]
