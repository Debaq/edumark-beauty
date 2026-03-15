import { useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import type { BookNode } from '@/hooks/useBookPagination'
import type { PageLayout } from '@/types/bookLayout'
import { getLayoutContentCss } from './BookPage'

interface Props {
  pages: BookNode[][]
  pageLayouts: PageLayout[]
  currentPage: number
  onSelectPage: (pageIndex: number) => void
  pageWidthPx: number
  pageHeightPx: number
  bookThemeCss: string
  columnGap: number
}

const THUMB_WIDTH = 120

export function BookThumbnails({
  pages,
  pageLayouts,
  currentPage,
  onSelectPage,
  pageWidthPx,
  pageHeightPx,
  bookThemeCss,
  columnGap,
}: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  // Scroll active thumbnail into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentPage])

  const scale = THUMB_WIDTH / pageWidthPx
  const thumbHeight = pageHeightPx * scale

  return (
    <div className="edm-book-thumbnails">
      {pages.map((pageNodes, idx) => {
        const layout = pageLayouts[idx] || 'stack'
        const isActive = idx === currentPage

        return (
          <button
            key={idx}
            ref={isActive ? activeRef : undefined}
            className={clsx('edm-book-thumbnail', isActive && 'active')}
            onClick={() => onSelectPage(idx)}
            style={{ width: THUMB_WIDTH, height: thumbHeight }}
          >
            <div
              className="edm-book-thumbnail-content edm-preview"
              style={{
                width: pageWidthPx,
                height: pageHeightPx,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                ...getLayoutContentCss(layout, columnGap),
                padding: '20px',
                overflow: 'hidden',
              }}
            >
              <style>{`.edm-book-thumbnail-content.edm-preview { ${bookThemeCss} }`}</style>
              {pageNodes.map((node) => (
                <div
                  key={node.nodeId}
                  dangerouslySetInnerHTML={{ __html: node.html }}
                />
              ))}
            </div>
            <span className="edm-book-thumbnail-number">{idx + 1}</span>
          </button>
        )
      })}
    </div>
  )
}
