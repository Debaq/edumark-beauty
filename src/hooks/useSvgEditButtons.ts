import { useEffect, type RefObject } from 'react'
import { useUIStore } from '@/store/ui'

const BTN_CLASS = 'edm-svg-edit-btn'

export const svgEditButtonCss = `
.edm-diagram-svg { position: relative; }
.${BTN_CLASS} {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.15);
  background: rgba(255,255,255,0.9);
  color: #374151;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
  font-size: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.${BTN_CLASS}:hover { background: #eff6ff; color: #3b82f6; border-color: #3b82f6; }
.edm-diagram-svg:hover .${BTN_CLASS} { opacity: 1; }
`

/**
 * Injects "Edit SVG" buttons on SVG diagram blocks in the preview.
 * Follows the same pattern as useQuestionInteractivity.
 */
export function useSvgEditButtons(
  rootRef: RefObject<HTMLElement | null>,
  html: string,
): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const svgContainers = root.querySelectorAll<HTMLElement>('.edm-diagram-svg')

    for (const container of svgContainers) {
      // Skip if button already injected
      if (container.querySelector(`.${BTN_CLASS}`)) continue

      // Find parent article to get diagram id
      const article = container.closest('article.edm-diagram')
      const diagramId = article?.getAttribute('id')
      if (!diagramId) continue

      const btn = document.createElement('button')
      btn.className = BTN_CLASS
      btn.title = 'Editar SVG'
      btn.innerHTML = '✏️'
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        const svgHtml = container.innerHTML.trim()
        useUIStore.getState().openSvgEditor(diagramId, svgHtml)
      })

      container.appendChild(btn)
    }

    return () => {
      // Cleanup buttons on unmount/re-render
      const root = rootRef.current
      if (!root) return
      root.querySelectorAll(`.${BTN_CLASS}`).forEach((btn) => btn.remove())
    }
  }, [html, rootRef])
}
