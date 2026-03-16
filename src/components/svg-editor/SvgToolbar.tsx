import {
  MousePointer2, Square, Circle, Minus, Type,
  Undo2, Redo2, Trash2,
  ZoomIn, ZoomOut, Maximize,
  Save, ArrowLeft,
} from 'lucide-react'

export type SvgTool = 'select' | 'rect' | 'circle' | 'line' | 'text'

interface Props {
  activeTool: SvgTool
  onToolChange: (tool: SvgTool) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  hasSelection: boolean
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onSave: () => void
  onCancel: () => void
}

const TOOLS: { id: SvgTool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer2 size={15} />, label: 'Seleccionar' },
  { id: 'rect', icon: <Square size={15} />, label: 'Rectangulo' },
  { id: 'circle', icon: <Circle size={15} />, label: 'Circulo' },
  { id: 'line', icon: <Minus size={15} />, label: 'Linea' },
  { id: 'text', icon: <Type size={15} />, label: 'Texto' },
]

export function SvgToolbar({
  activeTool, onToolChange,
  canUndo, canRedo, onUndo, onRedo,
  onDelete, hasSelection,
  zoom, onZoomIn, onZoomOut, onFit,
  onSave, onCancel,
}: Props) {
  const btn = 'edm-svg-toolbar-btn'

  return (
    <div className="edm-svg-toolbar">
      {/* Tools */}
      <div className="edm-svg-toolbar-group">
        {TOOLS.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`${btn} ${activeTool === id ? 'active' : ''}`}
            onClick={() => onToolChange(id)}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="edm-svg-toolbar-sep" />

      {/* Actions */}
      <div className="edm-svg-toolbar-group">
        <button className={btn} onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
          <Undo2 size={15} />
        </button>
        <button className={btn} onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 size={15} />
        </button>
        <button className={btn} onClick={onDelete} disabled={!hasSelection} title="Eliminar seleccion">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="edm-svg-toolbar-sep" />

      {/* Zoom */}
      <div className="edm-svg-toolbar-group">
        <button className={btn} onClick={onZoomOut} title="Alejar">
          <ZoomOut size={15} />
        </button>
        <span className="edm-svg-zoom-display">{Math.round(zoom * 100)}%</span>
        <button className={btn} onClick={onZoomIn} title="Acercar">
          <ZoomIn size={15} />
        </button>
        <button className={btn} onClick={onFit} title="Ajustar">
          <Maximize size={15} />
        </button>
      </div>

      <div className="flex-1" />

      {/* Save / Back */}
      <div className="edm-svg-toolbar-group" style={{ gap: '6px' }}>
        <button className={`${btn} save`} onClick={onSave} title="Guardar y volver" style={{ width: 'auto', padding: '0 10px', gap: '4px', display: 'flex' }}>
          <Save size={14} /> <span style={{ fontSize: '11px' }}>Guardar</span>
        </button>
        <button className={`${btn} cancel`} onClick={onCancel} title="Volver sin guardar" style={{ width: 'auto', padding: '0 10px', gap: '4px', display: 'flex' }}>
          <ArrowLeft size={14} /> <span style={{ fontSize: '11px' }}>Volver</span>
        </button>
      </div>
    </div>
  )
}
