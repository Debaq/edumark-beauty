import type { Slide, SlideConfig } from '@/types/contentMode'
import type { ThemeConfig } from '@/types/theme'

/**
 * Native PPTX export using pptxgenjs primitives.
 * Recreates edumark cards as grouped shapes (rounded rect + header bar + text),
 * headings as styled text, lists as bullet text, and SVGs/diagrams as rasterized images.
 *
 * EXPERIMENTAL — text is editable, cards are native shapes, but complex
 * content (math, tables) may not render perfectly.
 */

// ── Color helpers ──

function pptxColor(hex: string): string {
  return hex.replace('#', '').slice(0, 6).toUpperCase() || '000000'
}

/** Map edumark block type → theme color key */
const CARD_COLORS: Record<string, keyof ThemeConfig> = {
  'definition': 'blue',
  'key-concept': 'green',
  'note': 'yellow',
  'aside': 'yellow',
  'warning': 'orange',
  'example': 'teal',
  'application': 'teal',
  'exercise': 'accent',
  'objective': 'accent',
  'mnemonic': 'accent',
  'history': 'yellow',
  'summary': 'green',
  'reference': 'fg3',
  'question': 'accent',
  'math': 'blue',
  'diagram': 'blue',
  'image': 'blue',
  'teacher-only': 'orange',
  'student-only': 'accent',
  'solution': 'green',
}

const CARD_LABELS: Record<string, string> = {
  'objective': 'Objetivos de aprendizaje',
  'definition': 'Definición',
  'key-concept': 'Concepto clave',
  'note': 'Nota',
  'warning': 'Advertencia',
  'example': 'Ejemplo',
  'exercise': 'Ejercicio',
  'application': 'Aplicación',
  'comparison': 'Comparación',
  'diagram': 'Diagrama',
  'image': 'Figura',
  'question': 'Pregunta',
  'mnemonic': 'Mnemotécnico',
  'history': 'Contexto histórico',
  'summary': 'Resumen del capítulo',
  'reference': 'Referencias bibliográficas',
  'aside': 'Dato adicional',
  'teacher-only': 'Solo para el docente',
  'student-only': 'Actividad del estudiante',
  'solution': 'Solución',
  'math': 'Ecuación',
}

// ── Text extraction ──

function getText(el: Element): string {
  if (el.tagName.toLowerCase() === 'svg') return ''
  if (el.getAttribute('aria-hidden') === 'true') return ''
  let out = ''
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent || ''
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      out += getText(child as Element)
    }
  }
  return out
}

/** Rasterize an SVG element to a base64 PNG data URL */
async function rasterizeSvg(svgEl: SVGSVGElement, width: number): Promise<string | null> {
  try {
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.width = width * 2
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })

    const canvas = document.createElement('canvas')
    const ratio = img.naturalHeight / img.naturalWidth
    canvas.width = width * 2
    canvas.height = Math.round(width * 2 * ratio)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

// ── Main export ──

export async function exportPptxNative(
  slides: Slide[],
  theme: ThemeConfig,
  slideConfig: SlideConfig,
  filename: string
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()

  // Layout
  let aspectNum: number
  if (slideConfig.ratio === '4:3') aspectNum = 4 / 3
  else if (slideConfig.ratio === 'custom' && slideConfig.customWidth && slideConfig.customHeight)
    aspectNum = slideConfig.customWidth / slideConfig.customHeight
  else aspectNum = 16 / 9

  let slideW: number, slideH: number
  if (slideConfig.ratio === '4:3') { slideW = 10; slideH = 7.5 }
  else if (slideConfig.ratio === 'custom') { slideW = 13.333; slideH = slideW / aspectNum }
  else { slideW = 13.333; slideH = 7.5 }

  pptx.defineLayout({ name: 'EDM', width: slideW, height: slideH })
  pptx.layout = 'EDM'

  const bg = pptxColor(theme.bg)
  const bg1 = pptxColor(theme.bg1)
  const fg = pptxColor(theme.fg)
  const fg2 = pptxColor(theme.fg2)
  const hFont = theme.headingFont.split(',')[0].replace(/['"]/g, '').trim()
  const bFont = theme.bodyFont.split(',')[0].replace(/['"]/g, '').trim()
  const cardRadius = theme.cardRadius / 72  // px → inches approx
  const margin = 0.5
  const contentW = slideW - margin * 2

  for (const slide of slides) {
    const pptxSlide = pptx.addSlide()
    pptxSlide.background = { color: bg }
    pptxSlide.color = fg

    // Parse HTML
    const doc = new DOMParser().parseFromString(`<div>${slide.html}</div>`, 'text/html')
    const root = doc.body.firstElementChild
    if (!root) continue

    const isCover = slide.template === 'cover'
    let y = isCover ? slideH * 0.2 : 0.4
    const maxY = slideH - 0.3

    // ── Helpers ──

    function addHeading(text: string, size: number) {
      if (!text || y > maxY) return
      pptxSlide.addText(text, {
        x: margin, y, w: contentW,
        fontSize: size, color: fg, bold: true, fontFace: hFont,
        align: isCover ? 'center' : 'left',
      })
      y += size / 20 + 0.15
    }

    function addBody(text: string) {
      if (!text || y > maxY) return
      pptxSlide.addText(text, {
        x: margin, y, w: contentW,
        fontSize: 14, color: fg, fontFace: bFont, lineSpacingMultiple: 1.15,
      })
      const lines = Math.max(1, Math.ceil(text.length / 90))
      y += lines * 0.28 + 0.05
    }

    function addList(items: string[], numbered: boolean) {
      if (!items.length || y > maxY) return
      pptxSlide.addText(
        items.map((text) => ({
          text,
          options: { fontSize: 14, color: fg, fontFace: bFont, bullet: numbered ? { type: 'number' as const } : true },
        })),
        { x: margin + 0.15, y, w: contentW - 0.3, color: fg, fontSize: 14, fontFace: bFont },
      )
      y += items.length * 0.3 + 0.1
    }

    async function addSvgImage(svgEl: SVGSVGElement) {
      if (y > maxY) return
      const imgW = contentW * 0.7
      const data = await rasterizeSvg(svgEl, Math.round(imgW * 96))
      if (!data) return
      const img = new Image()
      await new Promise<void>((r) => { img.onload = () => r(); img.src = data })
      const ratio = img.naturalHeight / img.naturalWidth
      const imgH = Math.min(imgW * ratio, maxY - y)
      pptxSlide.addImage({
        data, x: margin + (contentW - imgW) / 2, y, w: imgW, h: imgH,
      })
      y += imgH + 0.15
    }

    /** Render an edm-card as a grouped shape (border-left rect + header + body text) */
    function addCard(el: Element) {
      if (y > maxY) return

      // Detect card type
      const typeMatch = Array.from(el.classList).find(c => c.startsWith('edm-') && c !== 'edm-card')
      const blockType = typeMatch ? typeMatch.replace('edm-', '') : ''
      const colorKey = CARD_COLORS[blockType] || 'accent'
      const cardColor = pptxColor((theme as unknown as Record<string, string>)[colorKey] || theme.accent)
      const label = CARD_LABELS[blockType] || blockType

      // Extract body content
      const bodyEl = el.querySelector('.edm-card-body')
      const titleEl = el.querySelector('.edm-card-title')
      const labelText = titleEl ? `${label}: ${getText(titleEl).trim()}` : label

      // Collect body text
      const bodyParts: string[] = []
      const listItems: string[] = []
      if (bodyEl) {
        for (const p of Array.from(bodyEl.querySelectorAll(':scope > p'))) {
          const t = getText(p).trim()
          if (t) bodyParts.push(t)
        }
        for (const dt of Array.from(bodyEl.querySelectorAll('dt'))) {
          const dd = dt.nextElementSibling
          const term = getText(dt).trim()
          const def = dd?.tagName.toLowerCase() === 'dd' ? getText(dd).trim() : ''
          if (term) bodyParts.push(`${term}: ${def}`)
        }
        for (const li of Array.from(bodyEl.querySelectorAll(':scope > ul > li, :scope > ol > li'))) {
          const t = getText(li).trim()
          if (t) listItems.push(t)
        }
        // Fallback: if no structured content found
        if (!bodyParts.length && !listItems.length) {
          const t = getText(bodyEl).trim()
          if (t) bodyParts.push(t)
        }
      }

      // Estimate card height
      const headerH = 0.4
      const bodyTextH = bodyParts.length * 0.35
      const listH = listItems.length * 0.28
      const cardH = Math.min(headerH + bodyTextH + listH + 0.3, maxY - y)
      if (cardH < 0.5) return

      const cardX = margin
      const cardY = y
      const cardW = contentW

      // Card background
      pptxSlide.addShape('roundRect' as any, {
        x: cardX, y: cardY, w: cardW, h: cardH,
        fill: { color: bg1 },
        line: { color: cardColor, width: 0.5 },
        rectRadius: cardRadius,
      })

      // Left accent bar
      pptxSlide.addShape('rect' as any, {
        x: cardX, y: cardY, w: 0.06, h: cardH,
        fill: { color: cardColor },
        line: { width: 0 },
      })

      // Header text (icon + label)
      pptxSlide.addText(labelText, {
        x: cardX + 0.2, y: cardY + 0.08, w: cardW - 0.4, h: headerH,
        fontSize: 13, color: cardColor, bold: true, fontFace: hFont,
        valign: 'middle',
      })

      // Body text
      let innerY = cardY + headerH + 0.1
      for (const text of bodyParts) {
        if (innerY + 0.25 > cardY + cardH) break
        pptxSlide.addText(text, {
          x: cardX + 0.25, y: innerY, w: cardW - 0.5,
          fontSize: 12, color: fg, fontFace: bFont, lineSpacingMultiple: 1.1,
        })
        const lines = Math.max(1, Math.ceil(text.length / 100))
        innerY += lines * 0.25
      }

      // List items
      if (listItems.length && innerY + 0.2 < cardY + cardH) {
        pptxSlide.addText(
          listItems.map(text => ({
            text,
            options: { fontSize: 12, color: fg, fontFace: bFont, bullet: true },
          })),
          { x: cardX + 0.3, y: innerY, w: cardW - 0.6, color: fg, fontSize: 12, fontFace: bFont },
        )
      }

      y += cardH + 0.2
    }

    // ── Process slide children ──

    for (const child of Array.from(root.children)) {
      if (y > maxY) break
      const tag = child.tagName.toLowerCase()
      if (tag === 'script' || tag === 'style') continue
      if (child.getAttribute('hidden') !== null) continue

      if (child.classList.contains('edm-hero')) {
        // Hero (frontmatter cover)
        const heroTitle = child.querySelector('.edm-hero-title')
        if (heroTitle) addHeading(getText(heroTitle).trim(), 36)
        const badges = child.querySelector('.edm-hero-badges')
        if (badges) {
          const text = getText(badges).trim()
          if (text) {
            pptxSlide.addText(text, {
              x: margin, y, w: contentW,
              fontSize: 14, color: fg2, fontFace: hFont,
              align: isCover ? 'center' : 'left',
            })
            y += 0.4
          }
        }
        const meta = child.querySelector('.edm-hero-meta')
        if (meta) addBody(getText(meta).trim())
        const topicsList = child.querySelector('.edm-hero-topics ul')
        if (topicsList) {
          const items = Array.from(topicsList.querySelectorAll(':scope > li'))
            .map(li => getText(li).trim()).filter(Boolean)
          addList(items, false)
        }
      } else if (/^h[1-3]$/.test(tag)) {
        addHeading(getText(child).trim(), tag === 'h1' ? 32 : tag === 'h2' ? 26 : 20)
      } else if (child.classList.contains('edm-card')) {
        addCard(child)
      } else if (tag === 'details') {
        addCard(child)  // solutions rendered as cards too
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(child.querySelectorAll(':scope > li'))
          .map(li => getText(li).trim()).filter(Boolean)
        addList(items, tag === 'ol')
      } else if (tag === 'svg') {
        await addSvgImage(child as unknown as SVGSVGElement)
      } else {
        // Check for SVGs inside this element
        const svg = child.querySelector('svg')
        if (svg) {
          await addSvgImage(svg as unknown as SVGSVGElement)
        } else {
          const text = getText(child).trim()
          if (text) addBody(text)
        }
      }
    }
  }

  // ── Post-process: patch OOXML theme so dk1/lt1 match edumark theme ──
  // Viewers (LibreOffice, Google Slides) use dk1 as default text color,
  // often ignoring per-run <a:solidFill>. We patch the theme ZIP entry.
  const outputName = filename.replace(/\.edm$/, '') + '.pptx'

  try {
    const JSZip = (await import('jszip')).default
    const rawData = await pptx.write({ outputType: 'arraybuffer' })
    const zip = await JSZip.loadAsync(rawData as ArrayBuffer)

    const themeFile = zip.file('ppt/theme/theme1.xml')
    if (themeFile) {
      let xml = await themeFile.async('string')
      xml = xml.replace(/<a:dk1>[\s\S]*?<\/a:dk1>/, `<a:dk1><a:srgbClr val="${fg}"/></a:dk1>`)
      xml = xml.replace(/<a:lt1>[\s\S]*?<\/a:lt1>/, `<a:lt1><a:srgbClr val="${bg}"/></a:lt1>`)
      zip.file('ppt/theme/theme1.xml', xml)
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = outputName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // Fallback: save without theme patch
    await pptx.writeFile({ fileName: outputName })
  }
}
