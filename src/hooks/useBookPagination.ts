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
function assignNodeIds(container: HTMLElement): BookNode[] {
  const nodes: BookNode[] = []
  const children = container.children
  let ordinal = 0

  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement
    if (child.tagName === 'STYLE' || child.tagName === 'LINK') continue

    const existingId = child.getAttribute('id')
    const nodeId = existingId || `node-${ordinal}`
    child.setAttribute('data-edm-node-id', nodeId)
    nodes.push({ nodeId, html: child.outerHTML })
    ordinal++
  }

  return nodes
}

/**
 * Walk top-level children of a container and group them into pages
 * based on available content height. Returns pages with node IDs.
 */
function paginateNodes(
  container: HTMLElement,
  contentHeight: number,
): BookNode[][] {
  const allNodes = assignNodeIds(container)
  const pages: BookNode[][] = []
  let currentPage: BookNode[] = []
  let accumulatedHeight = 0

  const children = container.children
  let nodeIdx = 0
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement
    if (child.tagName === 'STYLE' || child.tagName === 'LINK') continue

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

  return pages
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

  const pageWidthPx = mmToPx(pageConfig.width)
  const pageHeightPx = mmToPx(pageConfig.height)
  const paddingTop = mmToPx(pageConfig.margins.top)
  const paddingBottom = mmToPx(pageConfig.margins.bottom)
  const paddingLeft = mmToPx(pageConfig.margins.left)
  const paddingRight = mmToPx(pageConfig.margins.right)
  const contentHeight = pageHeightPx - paddingTop - paddingBottom

  // Load layout config from source on mount / source change
  useEffect(() => {
    const parsed = parseBookLayout(source)
    loadFromSource(parsed)
  }, [source, loadFromSource])

  const paginate = useCallback(() => {
    const el = measureRef.current
    if (!el || !html) return

    // Open all <details> — book mode shows solutions expanded
    el.querySelectorAll('details:not([open])').forEach((d) => d.setAttribute('open', ''))

    requestAnimationFrame(() => {
      // Always measure and assign IDs first
      const nodes = assignNodeIds(el)
      setAllNodes(nodes)

      if (layoutConfig?.isManual) {
        // Manual mode: use stored page distribution
        const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]))
        const manualPages: BookNode[][] = layoutConfig.pages.map((pageConf) =>
          pageConf.blockIds
            .map((id) => nodeMap.get(id))
            .filter((n): n is BookNode => n !== undefined)
        )
        setPages(manualPages)
        setTotalPages(manualPages.length)
      } else {
        // Auto pagination
        const result = paginateNodes(el, contentHeight)
        setPages(result)
        setTotalPages(result.length)
      }
    })
  }, [html, contentHeight, layoutConfig, setTotalPages])

  // Re-paginate when html or config changes
  useEffect(() => {
    if (!html) return
    const timer = setTimeout(paginate, 100)
    return () => clearTimeout(timer)
  }, [html, paginate])

  // Derive empty state outside of effects
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
