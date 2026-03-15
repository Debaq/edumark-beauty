import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { PageLayout, BlockProps } from '@/types/bookLayout'
import type { BookNode } from '@/hooks/useBookPagination'
import { BookBlock } from './BookBlock'

const LAYOUT_GRID_CSS: Record<PageLayout, React.CSSProperties> = {
  'stack': { gridTemplateColumns: '1fr' },
  'two-columns': { gridTemplateColumns: '1fr 1fr' },
  'grid-2x2': { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
  'sidebar-left': { gridTemplateColumns: '1fr 2fr' },
  'sidebar-right': { gridTemplateColumns: '2fr 1fr' },
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
  contentWidthPx: number
  contentHeightPx: number
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
  contentWidthPx,
  contentHeightPx,
}: BookPageProps) {
  const droppableId = `page-${pageIndex}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const gridNodes = nodes.filter((n) => {
    const props = blockProps[n.nodeId]
    return !props || props.positioning === 'grid'
  })
  const freeNodes = nodes.filter((n) => {
    const props = blockProps[n.nodeId]
    return props?.positioning === 'free'
  })

  const blockIds = gridNodes.map((n) => n.nodeId)

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
      <div ref={setNodeRef} style={{ position: 'relative', height: '100%' }}>
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
            {gridNodes.map((node) => {
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
                />
              )
            })}
          </div>
        </SortableContext>

        {/* Free-positioned blocks */}
        {freeNodes.map((node) => {
          const props = blockProps[node.nodeId]
          if (!props) return null
          const x = (props.x ?? 0) / 25.4 * 96
          const y = (props.y ?? 0) / 25.4 * 96
          const w = props.width ? props.width / 25.4 * 96 : undefined
          const h = props.height ? props.height / 25.4 * 96 : undefined

          return (
            <BookBlock
              key={node.nodeId}
              node={node}
              blockProps={props}
              isEditing={isEditing}
              isSelected={selectedBlockId === node.nodeId}
              onSelect={() => onSelectBlock(node.nodeId)}
              pageIndex={pageIndex}
              freeStyle={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: w ? `${w}px` : 'auto',
                height: h ? `${h}px` : 'auto',
                zIndex: 10,
              }}
              containerWidth={contentWidthPx}
              containerHeight={contentHeightPx}
            />
          )
        })}
      </div>

      <div className="edm-book-page-number">{pageIndex + 1}</div>
    </div>
  )
}
