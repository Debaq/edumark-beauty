export type PageLayout = 'stack' | 'two-columns' | 'grid-2x2' | 'sidebar-left' | 'sidebar-right'

export interface BlockProps {
  positioning: 'grid' | 'free'
  /** Columns this block spans (e.g. 2 in two-columns = full width) */
  gridSpan?: number
  /** Order within the grid */
  order?: number
  /** mm from left edge of content area (free mode) */
  x?: number
  /** mm from top edge of content area (free mode) */
  y?: number
  /** Width in mm (free mode, undefined = auto) */
  width?: number
  /** Height in mm (free mode, undefined = auto) */
  height?: number
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
}

export const DEFAULT_BLOCK_PROPS: BlockProps = {
  positioning: 'grid',
}

export const PAGE_LAYOUTS: { id: PageLayout; label: string }[] = [
  { id: 'stack', label: 'Una columna' },
  { id: 'two-columns', label: 'Dos columnas' },
  { id: 'grid-2x2', label: 'Grid 2×2' },
  { id: 'sidebar-left', label: 'Sidebar izquierda' },
  { id: 'sidebar-right', label: 'Sidebar derecha' },
]
