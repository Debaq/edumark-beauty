import { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { useBookLayoutStore } from '@/store/bookLayout'
import { parseBookLayout } from '@/lib/bookLayoutParser'

export interface BookNode {
  nodeId: string
  html: string
}

/** Convert mm to px at 96 DPI */
export function mmToPx(mm: number): number {
  return Math.round(mm * 96 / 25.4)
}

/** Convert px to mm at 96 DPI */
export function pxToMm(px: number): number {
  return Math.round(px * 25.4 / 96 * 10) / 10
}

/**
 * Assign a data-edm-node-id to each top-level element.
 * Uses existing `id` attribute if present, otherwise generates `node-{index}`.
 */
function assignNodeIds(container: HTMLElement, showHr: boolean): BookNode[] {
  const nodes: BookNode[] = []
  const children = container.children
  let ordinal = 0

  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement
    if (child.tagName === 'STYLE' || child.tagName === 'LINK') continue
    if (!showHr && child.tagName === 'HR') continue

    const existingId = child.getAttribute('id')
    const nodeId = existingId || `node-${ordinal}`
    child.setAttribute('data-edm-node-id', nodeId)
    nodes.push({ nodeId, html: child.outerHTML })
    ordinal++
  }

  return nodes
}

/** Detect if a node's HTML starts with a heading tag */
function isHeading(html: string): boolean {
  return /^<h[1-6][\s>]/i.test(html)
}

/**
 * Walk top-level children of a container and group them into pages
 * based on available content height. Returns pages with node IDs.
 * Post-process: if a page ends with a heading, move it to the next page.
 */
function paginateNodes(
  container: HTMLElement,
  contentHeight: number,
  showHr: boolean,
): BookNode[][] {
  const allNodes = assignNodeIds(container, showHr)
  const pages: BookNode[][] = []
  let currentPage: BookNode[] = []
  let accumulatedHeight = 0

  const children = container.children
  let nodeIdx = 0
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement
    if (child.tagName === 'STYLE' || child.tagName === 'LINK') continue
    if (!showHr && child.tagName === 'HR') continue

    const style = getComputedStyle(child)
    const marginTop = parseFloat(style.marginTop) || 0
    const marginBottom = parseFloat(style.marginBottom) || 0
    const totalHeight = child.offsetHeight + marginTop + marginBottom

    if (accumulatedHeight + totalHeight > contentHeight && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      accumulatedHeight = 0
    }

    currentPage.push(allNodes[nodeIdx])
    accumulatedHeight += totalHeight
    nodeIdx++
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  // Anti-orphan: if a page ends with a heading, move it to the next page
  for (let p = 0; p < pages.length - 1; p++) {
    const page = pages[p]
    if (page.length > 1 && isHeading(page[page.length - 1].html)) {
      const orphan = page.pop()!
      pages[p + 1].unshift(orphan)
    }
  }

  return pages
}

/** Deep compare two BookLayoutConfig objects by JSON */
function configsEqual(
  a: ReturnType<typeof parseBookLayout>,
  b: ReturnType<typeof parseBookLayout>,
): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export function useBookPagination() {
  const html = useDocumentStore((s) => s.html)
  const source = useDocumentStore((s) => s.source)
  const pageConfig = useContentModeStore((s) => s.pageConfig)
  const layoutConfig = useBookLayoutStore((s) => s.layoutConfig)
  const loadFromSource = useBookLayoutStore((s) => s.loadFromSource)
  const setTotalPages = useBookLayoutStore((s) => s.setTotalPages)

  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<BookNode[][]>([])
  const [allNodes, setAllNodes] = useState<BookNode[]>([])

  // Track last html used for node extraction to avoid redundant work
  const lastHtmlRef = useRef<string>('')
  const cachedNodesRef = useRef<BookNode[]>([])

  const pageWidthPx = mmToPx(pageConfig.width)
  const pageHeightPx = mmToPx(pageConfig.height)
  const paddingTop = mmToPx(pageConfig.margins.top)
  const paddingBottom = mmToPx(pageConfig.margins.bottom)
  const paddingLeft = mmToPx(pageConfig.margins.left)
  const paddingRight = mmToPx(pageConfig.margins.right)
  const contentHeight = pageHeightPx - paddingTop - paddingBottom

  // Load layout config from source on mount / source change
  // Compare before loading to avoid redundant cycles from debounced persist
  useEffect(() => {
    const parsed = parseBookLayout(source)
    const current = useBookLayoutStore.getState().layoutConfig
    if (!configsEqual(parsed, current)) {
      loadFromSource(parsed)
    }
  }, [source, loadFromSource])

  // In manual mode, rebuild pages from layoutConfig without re-measuring DOM
  // This avoids the expensive paginate→rAF cycle on every config change
  const rebuildManualPages = useCallback(() => {
    const config = useBookLayoutStore.getState().layoutConfig
    if (!config?.isManual) return

    const showHr = config.showHr ?? false
    // Use cached nodes if html hasn't changed
    let nodes = cachedNodesRef.current
    if (nodes.length === 0) {
      const el = measureRef.current
      if (!el) return
      nodes = assignNodeIds(el, showHr)
      cachedNodesRef.current = nodes
      lastHtmlRef.current = html || ''
    }

    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]))
    const manualPages: BookNode[][] = config.pages.map((pageConf) =>
      pageConf.blockIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is BookNode => n !== undefined)
    )
    setPages(manualPages)
    setAllNodes(nodes)
    setTotalPages(manualPages.length)
  }, [html, setTotalPages])

  const paginate = useCallback(() => {
    const el = measureRef.current
    if (!el || !html) return

    // Open all <details> — book mode shows solutions expanded
    el.querySelectorAll('details:not([open])').forEach((d) => d.setAttribute('open', ''))

    const showHr = layoutConfig?.showHr ?? false

    requestAnimationFrame(() => {
      const nodes = assignNodeIds(el, showHr)
      cachedNodesRef.current = nodes
      lastHtmlRef.current = html
      setAllNodes(nodes)

      if (layoutConfig?.isManual) {
        const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]))
        const manualPages: BookNode[][] = layoutConfig.pages.map((pageConf) =>
          pageConf.blockIds
            .map((id) => nodeMap.get(id))
            .filter((n): n is BookNode => n !== undefined)
        )
        setPages(manualPages)
        setTotalPages(manualPages.length)
      } else {
        const result = paginateNodes(el, contentHeight, showHr)
        setPages(result)
        setTotalPages(result.length)
      }
    })
  }, [html, contentHeight, layoutConfig, setTotalPages])

  // Re-paginate when html changes (content actually changed)
  useEffect(() => {
    if (!html) return
    const timer = setTimeout(paginate, 100)
    return () => clearTimeout(timer)
  }, [html, paginate])

  // In manual mode, rebuild pages immediately when layoutConfig changes
  // WITHOUT waiting for html/DOM — just remap existing nodes
  useEffect(() => {
    if (!layoutConfig?.isManual) return
    if (cachedNodesRef.current.length === 0) return // no nodes yet, wait for paginate
    rebuildManualPages()
  }, [layoutConfig, rebuildManualPages])

  const effectivePages = html ? pages : []
  const effectiveAllNodes = html ? allNodes : []

  return {
    pages: effectivePages,
    allNodes: effectiveAllNodes,
    measureRef,
    pageWidthPx,
    pageHeightPx,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    contentHeight,
  }
}
