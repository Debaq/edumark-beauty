import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PageLayout, BlockProps } from '@/types/bookLayout'
import type { BookNode } from '@/hooks/useBookPagination'
import { BookBlock } from './BookBlock'
import { BookPageLayoutBar } from './BookPageLayoutBar'

/** CSS for page content area based on layout (preview only, NOT editing) */
export function getLayoutContentCss(layout: PageLayout, columnGap: number): React.CSSProperties {
  if (layout === 'two-columns') {
    return { columnCount: 2, columnGap: `${columnGap}px` }
  }
  return {}
}

interface BookPageProps {
  pageIndex: number
  nodes: BookNode[]
  layout: PageLayout
  blockProps: Record<string, BlockProps>
  isEditing: boolean
  selectedBlockId: string | null
  onSelectBlock: (blockId: string | null) => void
  style: React.CSSProperties
  bookThemeCss: string
  totalPages: number
  columnGap: number
  docTextAlign?: string
  backgroundColor?: string
  onChangeLayout?: (layout: PageLayout) => void
}

export function BookPage({
  pageIndex,
  nodes,
  layout,
  blockProps,
  isEditing,
  selectedBlockId,
  onSelectBlock,
  style,
  bookThemeCss,
  totalPages,
  columnGap,
  docTextAlign,
  backgroundColor,
  onChangeLayout,
}: BookPageProps) {
  const droppableId = `page-${pageIndex}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const blockIds = nodes.map((n) => n.nodeId)
  const isTwoColumns = layout === 'two-columns'

  // In editing mode: NEVER apply column-count (breaks dnd-kit)
  // Only apply columns in preview mode
  const contentStyle: React.CSSProperties = isEditing
    ? { minHeight: 0, textAlign: docTextAlign as React.CSSProperties['textAlign'] }
    : { ...getLayoutContentCss(layout, columnGap), minHeight: 0, textAlign: docTextAlign as React.CSSProperties['textAlign'] }

  return (
    <div
      className={`edm-book-page ${isEditing ? 'edm-book-page-editing' : ''} ${isOver ? 'edm-book-page-drop-target' : ''}`}
      style={{ ...style, backgroundColor: backgroundColor ?? 'white' }}
      data-page-index={pageIndex}
      onClick={(e) => {
        if (e.target === e.currentTarget && isEditing) {
          onSelectBlock(null)
        }
      }}
    >
      {/* Per-page layout selector */}
      {isEditing && onChangeLayout && (
        <BookPageLayoutBar
          currentLayout={layout}
          onSelectLayout={onChangeLayout}
        />
      )}

      <div ref={setNodeRef} style={{ position: 'relative', height: '100%' }}>
        {/* Column guide for two-columns (editing only) */}
        {isEditing && isTwoColumns && (
          <div
            className="edm-book-column-guide"
            style={{ left: '50%', top: 0, bottom: 0, width: 0, borderLeft: '1px dashed rgba(59,130,246,0.3)' }}
          />
        )}

        {/* Page content area */}
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          <div
            className="edm-book-page-content edm-preview"
            style={contentStyle}
          >
            <style>{`.edm-book-page-content.edm-preview { ${bookThemeCss} }`}</style>
            {nodes.map((node) => {
              const props = blockProps[node.nodeId]
              return (
                <BookBlock
                  key={node.nodeId}
                  node={node}
                  blockProps={props}
                  isEditing={isEditing}
                  isSelected={selectedBlockId === node.nodeId}
                  onSelect={() => onSelectBlock(node.nodeId)}
                  pageIndex={pageIndex}
                  totalPages={totalPages}
                  isTwoColumns={isTwoColumns && !isEditing}
                />
              )
            })}
          </div>
        </SortableContext>
      </div>

      <div className="edm-book-page-number">{pageIndex + 1}</div>
    </div>
  )
}
