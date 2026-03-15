import { useEffect } from 'react'
import { decodeAsync } from 'edumark-js'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { parseSlides } from '@/lib/slideParser'
import { filterSlideHtml } from '@/lib/filterSlideHtml'
import type { Slide, FreeTextMode } from '@/types/contentMode'

const VALID_FREE_TEXT_MODES = new Set(['show', 'hide', 'notes'])

/**
 * Hook that parses slides from document source when in presentation mode.
 * Runs on every source change — parseSlides + decodeAsync are fast enough.
 *
 * Template resolution: metadata comment > auto-detect.
 * Free text filtering: per-slide metadata > global slideConfig.freeTextMode.
 */
export function useSlides() {
  const source = useDocumentStore((s) => s.source)
  const setSlides = useContentModeStore((s) => s.setSlides)
  const freeTextMode = useContentModeStore((s) => s.slideConfig.freeTextMode) ?? 'show'

  useEffect(() => {
    if (!source) return

    let cancelled = false

    async function renderSlides() {
      const rawSlides = parseSlides(source)

      const rendered: Slide[] = await Promise.all(
        rawSlides.map(async (raw) => {
          const fullHtml = await decodeAsync(raw.content)

          // Resolve free text mode: per-slide metadata overrides global
          const metaFt = raw.metadata.freetext
          const slideMode: FreeTextMode = (metaFt && VALID_FREE_TEXT_MODES.has(metaFt))
            ? metaFt as FreeTextMode
            : freeTextMode

          const { html, notes } = filterSlideHtml(fullHtml, slideMode)

          return {
            source: raw.source,
            content: raw.content,
            html,
            template: raw.template,
            metadata: raw.metadata,
            notes,
          }
        })
      )

      if (!cancelled) {
        setSlides(rendered)
      }
    }

    renderSlides()

    return () => { cancelled = true }
  }, [source, setSlides, freeTextMode])
}
