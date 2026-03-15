import { create } from 'zustand'
import type { BookLayoutConfig, PageLayout, BlockProps, PageConfig } from '@/types/bookLayout'
import { DEFAULT_BLOCK_PROPS } from '@/types/bookLayout'
import { updateBookLayoutInSource, removeBookLayoutFromSource } from '@/lib/bookLayoutParser'
import { useDocumentStore } from '@/store/document'

interface BookLayoutStore {
  /** Current layout config (null = auto pagination) */
  layoutConfig: BookLayoutConfig | null
  /** Currently selected block ID */
  selectedBlockId: string | null
  /** Currently selected page index */
  selectedPageIndex: number
  /** Whether editing mode is active */
  isEditing: boolean
  /** Total pages (for navigation) */
  totalPages: number

  setLayoutConfig: (config: BookLayoutConfig | null) => void
  loadFromSource: (config: BookLayoutConfig | null) => void
  moveBlock: (fromPage: number, fromIndex: number, toPage: number, toIndex: number) => void
  setPageLayout: (pageIndex: number, layout: PageLayout) => void
  setBlockProps: (pageIndex: number, blockId: string, props: Partial<BlockProps>) => void
  selectBlock: (blockId: string | null) => void
  setSelectedPageIndex: (index: number) => void
  toggleEditing: () => void
  setEditing: (editing: boolean) => void
  resetToAuto: () => void
  freeBlock: (pageIndex: number, blockId: string, x: number, y: number) => void
  gridBlock: (pageIndex: number, blockId: string) => void
  setTotalPages: (total: number) => void
  /** Initialize manual layout from auto-paginated pages */
  initFromAutoPages: (pages: { nodeId: string }[][]) => void
}

function persistConfig(config: BookLayoutConfig | null) {
  const source = useDocumentStore.getState().source
  let newSource: string
  if (config) {
    newSource = updateBookLayoutInSource(source, config)
  } else {
    newSource = removeBookLayoutFromSource(source)
  }
  if (newSource !== source) {
    useDocumentStore.getState().setSource(newSource)
  }
}

export const useBookLayoutStore = create<BookLayoutStore>((set, get) => ({
  layoutConfig: null,
  selectedBlockId: null,
  selectedPageIndex: 0,
  isEditing: false,
  totalPages: 0,

  setLayoutConfig: (config) => {
    set({ layoutConfig: config })
    persistConfig(config)
  },

  loadFromSource: (config) => {
    set({ layoutConfig: config })
  },

  moveBlock: (fromPage, fromIndex, toPage, toIndex) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)
    const srcPage = pages[fromPage]
    if (!srcPage) return

    const [blockId] = srcPage.blockIds.splice(fromIndex, 1)
    const dstPage = pages[toPage]
    if (!dstPage) return

    dstPage.blockIds.splice(toIndex, 0, blockId)

    // Move blockProps if crossing pages
    if (fromPage !== toPage) {
      const props = srcPage.blockProps[blockId]
      if (props) {
        delete srcPage.blockProps[blockId]
        dstPage.blockProps[blockId] = props
      }
    }

    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig })
    persistConfig(newConfig)
  },

  setPageLayout: (pageIndex, layout) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)
    if (!pages[pageIndex]) return

    pages[pageIndex].layout = layout
    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig })
    persistConfig(newConfig)
  },

  setBlockProps: (pageIndex, blockId, props) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)
    const page = pages[pageIndex]
    if (!page) return

    page.blockProps[blockId] = {
      ...(page.blockProps[blockId] || DEFAULT_BLOCK_PROPS),
      ...props,
    }

    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig })
    persistConfig(newConfig)
  },

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),

  setSelectedPageIndex: (index) => set({ selectedPageIndex: index }),

  toggleEditing: () => {
    const { isEditing } = get()
    set({ isEditing: !isEditing, selectedBlockId: null })
  },

  setEditing: (editing) => set({ isEditing: editing, selectedBlockId: null }),

  resetToAuto: () => {
    set({ layoutConfig: null, isEditing: false, selectedBlockId: null })
    persistConfig(null)
  },

  freeBlock: (pageIndex, blockId, x, y) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)
    const page = pages[pageIndex]
    if (!page) return

    page.blockProps[blockId] = {
      ...(page.blockProps[blockId] || DEFAULT_BLOCK_PROPS),
      positioning: 'free',
      x,
      y,
    }

    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig })
    persistConfig(newConfig)
  },

  gridBlock: (pageIndex, blockId) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)
    const page = pages[pageIndex]
    if (!page) return

    page.blockProps[blockId] = {
      positioning: 'grid',
    }

    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig })
    persistConfig(newConfig)
  },

  setTotalPages: (total) => set({ totalPages: total }),

  initFromAutoPages: (pages) => {
    const pageConfigs: PageConfig[] = pages.map((pageNodes) => ({
      layout: 'stack' as PageLayout,
      blockIds: pageNodes.map((n) => n.nodeId),
      blockProps: Object.fromEntries(
        pageNodes.map((n) => [n.nodeId, { ...DEFAULT_BLOCK_PROPS }])
      ),
    }))

    const config: BookLayoutConfig = {
      isManual: true,
      pages: pageConfigs,
    }

    set({ layoutConfig: config })
    persistConfig(config)
  },
}))
