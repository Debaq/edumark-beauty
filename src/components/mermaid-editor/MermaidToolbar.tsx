import { Save, ArrowLeft } from 'lucide-react'

interface Props {
  onSave: () => void
  onCancel: () => void
  hasChanges: boolean
}

export function MermaidToolbar({ onSave, onCancel, hasChanges }: Props) {
  const btn = 'edm-svg-toolbar-btn'

  return (
    <div className="edm-svg-toolbar">
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-fg2)' }}>
        Editor Mermaid
      </span>

      <div className="flex-1" />

      <div className="edm-svg-toolbar-group" style={{ gap: '6px' }}>
        <button
          className={`${btn} save`}
          onClick={onSave}
          disabled={!hasChanges}
          title="Guardar y volver"
          style={{ width: 'auto', padding: '0 10px', gap: '4px', display: 'flex' }}
        >
          <Save size={14} /> <span style={{ fontSize: '11px' }}>Guardar</span>
        </button>
        <button
          className={`${btn} cancel`}
          onClick={onCancel}
          title="Volver sin guardar"
          style={{ width: 'auto', padding: '0 10px', gap: '4px', display: 'flex' }}
        >
          <ArrowLeft size={14} /> <span style={{ fontSize: '11px' }}>Volver</span>
        </button>
      </div>
    </div>
  )
}
