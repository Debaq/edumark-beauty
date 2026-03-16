import { useEffect } from 'react'
import { useDocumentStore } from '@/store/document'

/**
 * Hook que intercepta clics en links de :::include para navegar
 * al capítulo correspondiente en modo proyecto.
 */
export function useIncludeLinks(
  containerRef: React.RefObject<HTMLElement | null>,
  html: string,
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.edm-include-ref')
      if (!link) return

      const file = link.getAttribute('data-include-file')
      if (!file) return

      const state = useDocumentStore.getState()
      if (!state.isProject) return

      // Buscar el capítulo por path
      const index = state.chapters.findIndex((ch) => {
        const base = ch.path.split('/').pop() ?? ch.path
        return ch.path === file || base === file
      })

      if (index >= 0) {
        e.preventDefault()
        state.setActiveChapter(index)
      }
    }

    container.addEventListener('click', handler)
    return () => container.removeEventListener('click', handler)
  }, [containerRef, html])
}
