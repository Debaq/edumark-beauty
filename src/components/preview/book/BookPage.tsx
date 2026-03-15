import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PageLayout, BlockProps } from '@/types/bookLayout'
import type { BookNode } from '@/hooks/useBookPagination'
import { BookBlock } from './BookBlock'
import { BookPageLayoutBar } from './BookPageLayoutBar'

/** CSS for page content area based on layout */
export const LAYOUT_CONTENT_CSS: Record<PageLayout, React.CSSProperties> = {
  'stack': {},
  'two-columns': { columnCount: 2, columnGap: '24px' },
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
  onChangeLayout,
}: BookPageProps) {
  const droppableId = `page-${pageIndex}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const blockIds = nodes.map((n) => n.nodeId)
  const isTwoColumns = layout === 'two-columns'

  return (
    <div
      className={`edm-book-page ${isEditing ? 'edm-book-page-editing' : ''} ${isOver ? 'edm-book-page-drop-target' : ''}`}
      style={style}
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
        {/* Column guide for two-columns */}
        {isEditing && isTwoColumns && (
          <div
            className="edm-book-column-guide"
            style={{ left: '50%', top: 0, bottom: 0, width: 0, borderLeft: '1px dashed rgba(59,130,246,0.3)' }}
          />
        )}

        {/* Page content area — uses CSS columns for two-columns */}
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          <div
            className="edm-book-page-content edm-preview"
            style={{
              ...LAYOUT_CONTENT_CSS[layout] || {},
              minHeight: 0,
            }}
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
                  isTwoColumns={isTwoColumns}
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
