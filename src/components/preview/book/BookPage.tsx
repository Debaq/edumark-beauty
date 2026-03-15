import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PageLayout, BlockProps } from '@/types/bookLayout'
import type { BookNode } from '@/hooks/useBookPagination'
import { BookBlock } from './BookBlock'
import { BookPageLayoutBar } from './BookPageLayoutBar'

export const LAYOUT_GRID_CSS: Record<PageLayout, React.CSSProperties> = {
  'stack': { gridTemplateColumns: '1fr' },
  'two-columns': { gridTemplateColumns: '1fr 1fr' },
  'grid-2x2': { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
  'sidebar-left': { gridTemplateColumns: '1fr 2fr' },
  'sidebar-right': { gridTemplateColumns: '2fr 1fr' },
}

/** Column guide lines for each layout */
const LAYOUT_GUIDES: Record<PageLayout, { type: 'v' | 'h'; pos: string }[]> = {
  'stack': [],
  'two-columns': [{ type: 'v', pos: '50%' }],
  'grid-2x2': [{ type: 'v', pos: '50%' }, { type: 'h', pos: '50%' }],
  'sidebar-left': [{ type: 'v', pos: '33.33%' }],
  'sidebar-right': [{ type: 'v', pos: '66.67%' }],
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
  const guides = LAYOUT_GUIDES[layout]

  return (
    <div
      className={`edm-book-page ${isEditing ? 'edm-book-page-editing' : ''} ${isOver ? 'edm-book-page-drop-target' : ''}`}
      style={style}
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
        {/* Column guides */}
        {isEditing && guides.map((guide, idx) => (
          <div
            key={idx}
            className="edm-book-column-guide"
            style={guide.type === 'v'
              ? { left: guide.pos, top: 0, bottom: 0, width: 0, borderLeft: '1px dashed rgba(59,130,246,0.3)' }
              : { top: guide.pos, left: 0, right: 0, height: 0, borderTop: '1px dashed rgba(59,130,246,0.3)' }
            }
          />
        ))}

        {/* Grid layout area */}
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          <div
            className="edm-book-page-grid edm-preview"
            style={{
              display: 'grid',
              ...LAYOUT_GRID_CSS[layout],
              gap: '0px',
              minHeight: 0,
              alignContent: 'start',
            }}
          >
            <style>{`.edm-book-page-grid.edm-preview { ${bookThemeCss} }`}</style>
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
