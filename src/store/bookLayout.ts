import { create } from 'zustand'
import type { BookLayoutConfig, PageLayout, BlockProps, PageConfig, TextAlign } from '@/types/bookLayout'
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
  moveBlockToPage: (blockId: string, targetPage: number, position: 'start' | 'end') => void
  setPageLayout: (pageIndex: number, layout: PageLayout) => void
  setBlockProps: (pageIndex: number, blockId: string, props: Partial<BlockProps>) => void
  selectBlock: (blockId: string | null) => void
  setSelectedPageIndex: (index: number) => void
  toggleEditing: () => void
  setEditing: (editing: boolean) => void
  resetToAuto: () => void
  setTotalPages: (total: number) => void
  /** Initialize manual layout from auto-paginated pages */
  initFromAutoPages: (pages: { nodeId: string }[][]) => void
  setColumnGap: (gap: number) => void
  setDocTextAlign: (align: TextAlign) => void
  setShowHr: (show: boolean) => void
  /** Force immediate persist (e.g. before PDF export) */
  flushPersist: () => void
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingConfig: BookLayoutConfig | null | undefined = undefined

function doPersist(config: BookLayoutConfig | null) {
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

function debouncedPersist(config: BookLayoutConfig | null, delay = 500) {
  pendingConfig = config
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    if (pendingConfig !== undefined) {
      doPersist(pendingConfig)
      pendingConfig = undefined
    }
    persistTimer = null
  }, delay)
}

function flushPendingPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (pendingConfig !== undefined) {
    doPersist(pendingConfig)
    pendingConfig = undefined
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
    debouncedPersist(config)
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
    debouncedPersist(newConfig)
  },

  moveBlockToPage: (blockId, targetPage, position) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)

    // Find current page
    let fromPageIdx = -1
    let fromBlockIdx = -1
    for (let p = 0; p < pages.length; p++) {
      const idx = pages[p].blockIds.indexOf(blockId)
      if (idx >= 0) {
        fromPageIdx = p
        fromBlockIdx = idx
        break
      }
    }
    if (fromPageIdx < 0 || fromBlockIdx < 0) return
    if (targetPage < 0 || targetPage >= pages.length) return
    if (fromPageIdx === targetPage) return

    const srcPage = pages[fromPageIdx]
    const dstPage = pages[targetPage]

    srcPage.blockIds.splice(fromBlockIdx, 1)
    if (position === 'start') {
      dstPage.blockIds.unshift(blockId)
    } else {
      dstPage.blockIds.push(blockId)
    }

    // Move props
    const props = srcPage.blockProps[blockId]
    if (props) {
      delete srcPage.blockProps[blockId]
      dstPage.blockProps[blockId] = props
    }

    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig, selectedPageIndex: targetPage })
    debouncedPersist(newConfig)
  },

  setPageLayout: (pageIndex, layout) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return

    const pages = structuredClone(layoutConfig.pages)
    if (!pages[pageIndex]) return

    pages[pageIndex].layout = layout
    const newConfig = { ...layoutConfig, pages }
    set({ layoutConfig: newConfig })
    debouncedPersist(newConfig)
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
    debouncedPersist(newConfig)
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
    doPersist(null)
  },

  setTotalPages: (total) => {
    const { selectedPageIndex } = get()
    const clamped = total > 0 ? Math.min(selectedPageIndex, total - 1) : 0
    set({ totalPages: total, selectedPageIndex: clamped })
  },

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
    doPersist(config)
  },

  setShowHr: (show) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return
    const newConfig = { ...layoutConfig, showHr: show }
    set({ layoutConfig: newConfig })
    debouncedPersist(newConfig)
  },

  setColumnGap: (gap) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return
    const newConfig = { ...layoutConfig, columnGap: gap }
    set({ layoutConfig: newConfig })
    debouncedPersist(newConfig)
  },

  setDocTextAlign: (align) => {
    const { layoutConfig } = get()
    if (!layoutConfig) return
    const newConfig = { ...layoutConfig, textAlign: align }
    set({ layoutConfig: newConfig })
    debouncedPersist(newConfig)
  },

  flushPersist: () => {
    flushPendingPersist()
  },
}))
