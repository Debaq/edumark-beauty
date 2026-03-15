import { useEffect } from 'react'
import { decodeAsync } from 'edumark-js'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { parseSlides } from '@/lib/slideParser'
import type { Slide } from '@/types/contentMode'

/**
 * Hook that parses slides from document source when in presentation mode.
 * Runs on every source change — parseSlides + decodeAsync are fast enough.
 *
 * Template resolution: metadata comment > auto-detect.
 * The `slideTemplates` store map is no longer used — source metadata is
 * the single source of truth.
 */
export function useSlides() {
  const source = useDocumentStore((s) => s.source)
  const setSlides = useContentModeStore((s) => s.setSlides)

  useEffect(() => {
    if (!source) return

    let cancelled = false

    async function renderSlides() {
      const rawSlides = parseSlides(source)

      const rendered: Slide[] = await Promise.all(
        rawSlides.map(async (raw) => {
          const html = await decodeAsync(raw.content)
          return {
            source: raw.source,
            content: raw.content,
            html,
            template: raw.template,
            metadata: raw.metadata,
          }
        })
      )

      if (!cancelled) {
        setSlides(rendered)
      }
    }

    renderSlides()

    return () => { cancelled = true }
  }, [source, setSlides])
}
