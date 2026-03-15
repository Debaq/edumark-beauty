import type { Slide, SlideConfig } from '@/types/contentMode'
import type { ThemeConfig } from '@/types/theme'

/**
 * Experimental PPTX export using pptxgenjs.
 * Converts slide content to text primitives.
 */
export async function exportPptx(
  slides: Slide[],
  theme: ThemeConfig,
  slideConfig: SlideConfig,
  filename: string
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default

  const pptx = new PptxGenJS()

  // Set slide dimensions based on ratio
  if (slideConfig.ratio === '4:3') {
    pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 7.5 })
    pptx.layout = 'CUSTOM'
  } else {
    // 16:9 is default in pptxgenjs
    pptx.layout = 'LAYOUT_WIDE'
  }

  for (const slide of slides) {
    const pptxSlide = pptx.addSlide()

    // Set background color from theme
    pptxSlide.background = { color: theme.bg.replace('#', '') }

    // Parse slide HTML into a temp DOM to extract content
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<div>${slide.html}</div>`, 'text/html')
    const root = doc.body.firstElementChild!

    let yPos = 0.5 // Starting Y position in inches

    for (const node of Array.from(root.children)) {
      const tag = node.tagName.toLowerCase()
      const text = node.textContent?.trim() || ''
      if (!text) continue

      if (/^h[1-3]$/.test(tag)) {
        const fontSize = tag === 'h1' ? 36 : tag === 'h2' ? 28 : 22
        pptxSlide.addText(text, {
          x: 0.5,
          y: yPos,
          w: '90%',
          fontSize,
          color: theme.fg.replace('#', ''),
          bold: true,
          fontFace: theme.headingFont.split(',')[0].replace(/['"]/g, '').trim(),
        })
        yPos += fontSize / 36 + 0.3
      } else if (tag === 'ul' || tag === 'ol') {
        const items = node.querySelectorAll('li')
        const bullets = Array.from(items).map((li) => ({
          text: li.textContent || '',
          options: {
            fontSize: 18,
            color: theme.fg.replace('#', ''),
            bullet: tag === 'ul' ? { type: 'bullet' as const } : { type: 'number' as const },
            fontFace: theme.bodyFont.split(',')[0].replace(/['"]/g, '').trim(),
          },
        }))
        pptxSlide.addText(bullets, {
          x: 0.5,
          y: yPos,
          w: '90%',
        })
        yPos += items.length * 0.4 + 0.2
      } else if (tag === 'img') {
        const src = (node as HTMLImageElement).src
        if (src && (src.startsWith('http') || src.startsWith('data:'))) {
          try {
            pptxSlide.addImage({
              path: src,
              x: 0.5,
              y: yPos,
              w: 4,
              h: 3,
            })
            yPos += 3.3
          } catch {
            // Skip images that can't be loaded
          }
        }
      } else {
        pptxSlide.addText(text, {
          x: 0.5,
          y: yPos,
          w: '90%',
          fontSize: 18,
          color: theme.fg.replace('#', ''),
          fontFace: theme.bodyFont.split(',')[0].replace(/['"]/g, '').trim(),
        })
        yPos += 0.5
      }
    }
  }

  await pptx.writeFile({
    fileName: filename.replace(/\.edm$/, '') + '.pptx',
  })
}
