import { useCallback } from 'react'

export interface ElementAttrs {
  tagName: string
  [key: string]: string | undefined
}

interface Props {
  element: ElementAttrs | null
  viewBox: string
  onChangeAttr: (attr: string, value: string) => void
  onChangeViewBox: (viewBox: string) => void
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="edm-svg-props-row">
      <label>{label}</label>
      <input
        type="number"
        className="edm-svg-props-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        step="any"
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isCurrent = value === 'currentColor'
  const hexValue = isCurrent ? '#000000' : (value || '#000000')

  const handleToggle = useCallback(() => {
    onChange(isCurrent ? '#000000' : 'currentColor')
  }, [isCurrent, onChange])

  return (
    <div className="edm-svg-props-row">
      <label>{label}</label>
      <div className="edm-svg-color-toggle">
        <button
          className={isCurrent ? 'active' : ''}
          onClick={handleToggle}
          title="currentColor (hereda del tema)"
        >
          auto
        </button>
        {!isCurrent && (
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
          />
        )}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="edm-svg-props-row">
      <label>{label}</label>
      <input
        type="text"
        className="edm-svg-props-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function SvgPropertiesPanel({ element, viewBox, onChangeAttr, onChangeViewBox }: Props) {
  if (!element) {
    // Show viewBox editor when nothing is selected
    const parts = viewBox.split(/[\s,]+/).map(Number)
    const [minX = 0, minY = 0, w = 300, h = 200] = parts

    const handleVB = (idx: number, val: string) => {
      const p = [...parts]
      p[idx] = Number(val) || 0
      onChangeViewBox(p.join(' '))
    }

    return (
      <div className="edm-svg-props-panel">
        <div className="edm-svg-props-section">
          <span className="edm-svg-props-label">viewBox</span>
          <NumField label="x" value={String(minX)} onChange={(v) => handleVB(0, v)} />
          <NumField label="y" value={String(minY)} onChange={(v) => handleVB(1, v)} />
          <NumField label="w" value={String(w)} onChange={(v) => handleVB(2, v)} />
          <NumField label="h" value={String(h)} onChange={(v) => handleVB(3, v)} />
        </div>
        <p className="text-[10px] text-[var(--app-fg3)] mt-4">
          Selecciona un elemento para editar sus propiedades
        </p>
      </div>
    )
  }

  const tag = element.tagName.toLowerCase()

  return (
    <div className="edm-svg-props-panel">
      <div className="edm-svg-props-section">
        <span className="edm-svg-props-label">{`<${tag}>`}</span>
      </div>

      {/* Position / Geometry based on tag type */}
      <div className="edm-svg-props-section">
        <span className="edm-svg-props-label">Geometria</span>

        {tag === 'rect' && (
          <>
            <NumField label="x" value={element.x ?? '0'} onChange={(v) => onChangeAttr('x', v)} />
            <NumField label="y" value={element.y ?? '0'} onChange={(v) => onChangeAttr('y', v)} />
            <NumField label="w" value={element.width ?? '0'} onChange={(v) => onChangeAttr('width', v)} />
            <NumField label="h" value={element.height ?? '0'} onChange={(v) => onChangeAttr('height', v)} />
            <NumField label="rx" value={element.rx ?? '0'} onChange={(v) => onChangeAttr('rx', v)} />
          </>
        )}

        {tag === 'circle' && (
          <>
            <NumField label="cx" value={element.cx ?? '0'} onChange={(v) => onChangeAttr('cx', v)} />
            <NumField label="cy" value={element.cy ?? '0'} onChange={(v) => onChangeAttr('cy', v)} />
            <NumField label="r" value={element.r ?? '0'} onChange={(v) => onChangeAttr('r', v)} />
          </>
        )}

        {tag === 'ellipse' && (
          <>
            <NumField label="cx" value={element.cx ?? '0'} onChange={(v) => onChangeAttr('cx', v)} />
            <NumField label="cy" value={element.cy ?? '0'} onChange={(v) => onChangeAttr('cy', v)} />
            <NumField label="rx" value={element.rx ?? '0'} onChange={(v) => onChangeAttr('rx', v)} />
            <NumField label="ry" value={element.ry ?? '0'} onChange={(v) => onChangeAttr('ry', v)} />
          </>
        )}

        {tag === 'line' && (
          <>
            <NumField label="x1" value={element.x1 ?? '0'} onChange={(v) => onChangeAttr('x1', v)} />
            <NumField label="y1" value={element.y1 ?? '0'} onChange={(v) => onChangeAttr('y1', v)} />
            <NumField label="x2" value={element.x2 ?? '0'} onChange={(v) => onChangeAttr('x2', v)} />
            <NumField label="y2" value={element.y2 ?? '0'} onChange={(v) => onChangeAttr('y2', v)} />
          </>
        )}

        {tag === 'text' && (
          <>
            <NumField label="x" value={element.x ?? '0'} onChange={(v) => onChangeAttr('x', v)} />
            <NumField label="y" value={element.y ?? '0'} onChange={(v) => onChangeAttr('y', v)} />
            <TextField label="txt" value={element._textContent ?? ''} onChange={(v) => onChangeAttr('_textContent', v)} />
            <NumField label="sz" value={element['font-size'] ?? '12'} onChange={(v) => onChangeAttr('font-size', v)} />
          </>
        )}

        {(tag === 'g' || tag === 'polygon' || tag === 'polyline' || tag === 'path') && (
          <p className="text-[10px] text-[var(--app-fg3)]">
            Arrastra para mover
          </p>
        )}
      </div>

      {/* Style */}
      <div className="edm-svg-props-section">
        <span className="edm-svg-props-label">Estilo</span>
        <ColorField label="fill" value={element.fill ?? 'none'} onChange={(v) => onChangeAttr('fill', v)} />
        <ColorField label="strk" value={element.stroke ?? 'currentColor'} onChange={(v) => onChangeAttr('stroke', v)} />
        <NumField label="sw" value={element['stroke-width'] ?? '1'} onChange={(v) => onChangeAttr('stroke-width', v)} />
        <NumField label="op" value={element.opacity ?? '1'} onChange={(v) => onChangeAttr('opacity', v)} />
      </div>
    </div>
  )
}
