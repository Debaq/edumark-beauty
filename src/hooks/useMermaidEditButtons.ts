import { useEffect, type RefObject } from 'react'
import { useUIStore } from '@/store/ui'

const BTN_CLASS = 'edm-mermaid-edit-btn'

export const mermaidEditButtonCss = `
.edm-mermaid-rendered { position: relative; }
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
.${BTN_CLASS}:hover { background: #f5f3ff; color: #7c3aed; border-color: #7c3aed; }
.edm-mermaid-rendered:hover .${BTN_CLASS} { opacity: 1; }
`

/**
 * Injects "Edit Mermaid" buttons on rendered Mermaid diagram blocks in the preview.
 */
export function useMermaidEditButtons(
  rootRef: RefObject<HTMLElement | null>,
  html: string,
): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const rendered = root.querySelectorAll<HTMLElement>('.edm-mermaid-rendered')

    for (const container of rendered) {
      if (container.querySelector(`.${BTN_CLASS}`)) continue

      // Find parent article to get diagram id
      const article = container.closest('article.edm-diagram')
      const diagramId = article?.getAttribute('id')
      if (!diagramId) continue

      // Get the original mermaid source from data attribute
      const mermaidSrc = container.getAttribute('data-mermaid-src')
      if (!mermaidSrc) continue

      const btn = document.createElement('button')
      btn.className = BTN_CLASS
      btn.title = 'Editar Mermaid'
      btn.innerHTML = '✏️'
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        useUIStore.getState().openMermaidEditor(diagramId, mermaidSrc)
      })

      container.appendChild(btn)
    }

    return () => {
      const root = rootRef.current
      if (!root) return
      root.querySelectorAll(`.${BTN_CLASS}`).forEach((btn) => btn.remove())
    }
  }, [html, rootRef])
}
