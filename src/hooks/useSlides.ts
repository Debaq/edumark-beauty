import { useEffect } from 'react'
import { decodeAsync } from 'edumark-js'
import { useDocumentStore } from '@/store/document'
import { useContentModeStore } from '@/store/contentMode'
import { parseSlides } from '@/lib/slideParser'
import type { Slide } from '@/types/contentMode'

/**
 * Hook that parses slides from document source when in presentation mode.
 * Runs on every source change — parseSlides + decodeAsync are fast enough.
 */
export function useSlides() {
  const source = useDocumentStore((s) => s.source)
  const setSlides = useContentModeStore((s) => s.setSlides)
  const slideTemplates = useContentModeStore((s) => s.slideTemplates)

  useEffect(() => {
    if (!source) return

    let cancelled = false

    async function renderSlides() {
      const rawSlides = parseSlides(source)

      const rendered: Slide[] = await Promise.all(
        rawSlides.map(async (raw, i) => {
          const html = await decodeAsync(raw.source)
          const template = slideTemplates.get(i) ?? raw.template
          return { source: raw.source, html, template }
        })
      )

      if (!cancelled) {
        setSlides(rendered)
      }
    }

    renderSlides()

    return () => { cancelled = true }
  }, [source, setSlides, slideTemplates])
}
