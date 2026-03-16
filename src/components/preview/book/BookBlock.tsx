import { useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import type { BookNode } from '@/hooks/useBookPagination'
import type { BlockProps } from '@/types/bookLayout'
import { useBookLayoutStore } from '@/store/bookLayout'

interface BookBlockProps {
  node: BookNode
  blockProps?: BlockProps
  isEditing: boolean
  isSelected: boolean
  onSelect: () => void
  pageIndex: number
  totalPages: number
  isTwoColumns: boolean
}

interface BlockInfo {
  type: string
  label: string
  snippet: string
  icon: string
}

function detectBlockInfo(html: string): BlockInfo {
  // Try edm class first
  const edmMatch = html.match(/class="[^"]*edm-(\w+)/)
  if (edmMatch) {
    const type = edmMatch[1]
    const labelMap: Record<string, string> = {
      exercise: 'Ejercicio',
      definition: 'Definición',
      theorem: 'Teorema',
      example: 'Ejemplo',
      note: 'Nota',
      warning: 'Aviso',
      tip: 'Consejo',
      important: 'Importante',
      hero: 'Hero',
      question: 'Pregunta',
      vocabulary: 'Vocabulario',
      timeline: 'Línea temporal',
      objectives: 'Objetivos',
      summary: 'Resumen',
      activity: 'Actividad',
      reading: 'Lectura',
      diagram: 'Diagrama',
      quote: 'Cita',
    }
    const snippet = extractSnippet(html)
    return {
      type,
      label: labelMap[type] || type.charAt(0).toUpperCase() + type.slice(1),
      snippet,
      icon: '◆',
    }
  }

  // Try standard HTML tags
  const tagMatch = html.match(/^<(h[1-6]|p|ul|ol|blockquote|pre|table|figure|details|hr)[\s>]/)
  if (tagMatch) {
    const tag = tagMatch[1]
    const tagLabelMap: Record<string, [string, string]> = {
      h1: ['Título 1', '𝐇'],
      h2: ['Título 2', '𝐇'],
      h3: ['Título 3', '𝐇'],
      h4: ['Título 4', '𝐇'],
      h5: ['Título 5', '𝐇'],
      h6: ['Título 6', '𝐇'],
      p: ['Párrafo', '¶'],
      ul: ['Lista', '•'],
      ol: ['Lista num.', '#'],
      blockquote: ['Cita', '❝'],
      pre: ['Código', '</>'],
      table: ['Tabla', '▦'],
      figure: ['Figura', '🖼'],
      details: ['Desplegable', '▸'],
      hr: ['Separador', '—'],
    }
    const [label, icon] = tagLabelMap[tag] || [tag, '·']
    const snippet = extractSnippet(html)
    return { type: tag, label, snippet, icon }
  }

  return { type: 'div', label: 'Bloque', snippet: extractSnippet(html), icon: '·' }
}

function extractSnippet(html: string): string {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > 40 ? text.slice(0, 37) + '...' : text
}

/** Check if block HTML is an edm pedagogical block */
function isEdmBlock(html: string): boolean {
  return /class="[^"]*edm-/.test(html)
}

/** Build inline CSS from block props (spacing + visual styles) */
function buildBlockStyle(props?: BlockProps): React.CSSProperties {
  if (!props) return {}
  const s: React.CSSProperties = {}
  if (props.marginTop) s.marginTop = `${props.marginTop}px`
  if (props.marginBottom) s.marginBottom = `${props.marginBottom}px`
  if (props.backgroundColor) s.backgroundColor = props.backgroundColor
  if (props.padding) s.padding = `${props.padding}px`
  if (props.borderRadius) s.borderRadius = `${props.borderRadius}px`
  if (props.borderColor && props.borderWidth) {
    s.border = `${props.borderWidth}px solid ${props.borderColor}`
  }
  if (props.shadow) s.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'
  return s
}

export function BookBlock({
  node,
  blockProps,
  isEditing,
  isSelected,
  onSelect,
  pageIndex,
  totalPages,
  isTwoColumns,
}: BookBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.nodeId,
    data: { pageIndex, nodeId: node.nodeId },
    disabled: !isEditing,
  })

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    order: blockProps?.order,
    textAlign: blockProps?.textAlign,
    ...buildBlockStyle(blockProps),
  }

  // In two-columns mode: edm blocks avoid breaking, fullWidth spans all columns
  if (isTwoColumns) {
    if (isEdmBlock(node.html)) {
      sortableStyle.breakInside = 'avoid'
    }
    if (blockProps?.fullWidth) {
      sortableStyle.columnSpan = 'all'
    }
  }

  const moveBlockToPage = useBookLayoutStore((s) => s.moveBlockToPage)

  const handleMovePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    moveBlockToPage(node.nodeId, pageIndex - 1, 'end')
  }, [moveBlockToPage, node.nodeId, pageIndex])

  const handleMoveNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    moveBlockToPage(node.nodeId, pageIndex + 1, 'start')
  }, [moveBlockToPage, node.nodeId, pageIndex])

  const blockInfo = isEditing ? detectBlockInfo(node.html) : null

  return (
    <div
      ref={setNodeRef}
      className={`edm-book-block ${isEditing ? 'edm-book-block-editing' : ''} ${isSelected ? 'edm-book-block-selected' : ''} ${isDragging ? 'edm-book-block-dragging' : ''}`}
      style={sortableStyle}
      onClick={(e) => {
        if (isEditing) {
          e.stopPropagation()
          onSelect()
        }
      }}
      data-edm-node-id={node.nodeId}
    >
      {/* Drag handle */}
      {isEditing && (
        <div
          className="edm-book-block-handle"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Block type badge */}
      {isEditing && blockInfo && (
        <div className="edm-book-block-badge">
          <span className="edm-book-block-badge-icon">{blockInfo.icon}</span>
          {' '}{blockInfo.label}
          {blockInfo.snippet && (
            <span className="edm-book-block-badge-snippet"> — {blockInfo.snippet}</span>
          )}
        </div>
      )}

      {/* Block content */}
      <div dangerouslySetInnerHTML={{ __html: node.html }} />

      {/* Move to page buttons */}
      {isEditing && isSelected && (
        <div className="edm-book-block-actions">
          {pageIndex > 0 && (
            <button
              onClick={handleMovePrev}
              className="edm-book-block-action-btn"
              title="Mover a página anterior"
            >
              <ChevronUp size={14} />
            </button>
          )}
          {pageIndex < totalPages - 1 && (
            <button
              onClick={handleMoveNext}
              className="edm-book-block-action-btn"
              title="Mover a página siguiente"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { detectBlockInfo }
export type { BlockInfo }
