import type { Slide, SlideConfig } from '@/types/contentMode'
import type { ThemeConfig } from '@/types/theme'
import { generateThemeCss } from '@/components/preview/previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import presentationCss from '@/styles/presentation.css?raw'

/**
 * PPTX export — renders each slide to a canvas image (html2canvas)
 * and embeds it as a full-slide image in pptxgenjs.
 *
 * This produces pixel-perfect slides that match the preview exactly,
 * including cards, math, diagrams, SVGs, and theme colors.
 */
export async function exportPptxRaster(
  slides: Slide[],
  theme: ThemeConfig,
  slideConfig: SlideConfig,
  filename: string,
  slideZoomOverrides?: Map<number, number>
): Promise<void> {
  const [PptxGenJSModule, html2canvasModule] = await Promise.all([
    import('pptxgenjs'),
    import('html2canvas'),
  ])
  const PptxGenJS = PptxGenJSModule.default
  const html2canvas = html2canvasModule.default

  // Resolve aspect ratio
  let aspectNum: number
  if (slideConfig.ratio === '4:3') {
    aspectNum = 4 / 3
  } else if (slideConfig.ratio === 'custom' && slideConfig.customWidth && slideConfig.customHeight) {
    aspectNum = slideConfig.customWidth / slideConfig.customHeight
  } else {
    aspectNum = 16 / 9
  }

  // Pixel dimensions for rendering (same as PDF export)
  const slideWidthPx = 1200
  const slideHeightPx = Math.round(slideWidthPx / aspectNum)

  // PPTX dimensions in inches
  let slideW: number
  let slideH: number
  if (slideConfig.ratio === '4:3') {
    slideW = 10; slideH = 7.5
  } else if (slideConfig.ratio === 'custom' && slideConfig.customWidth && slideConfig.customHeight) {
    slideW = 13.333
    slideH = slideW / aspectNum
  } else {
    slideW = 13.333; slideH = 7.5
  }

  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'EDM', width: slideW, height: slideH })
  pptx.layout = 'EDM'

  const themeCssVars = generateThemeCss(theme)
  const sharedCss = `
    .edm-preview { ${themeCssVars} }
    ${previewBaseCss}
    ${presentationCss}
    ${theme.customCss || ''}
    .pptx-slide-root {
      width: ${slideWidthPx}px;
      height: ${slideHeightPx}px;
      container-type: inline-size;
      overflow: hidden;
      position: relative;
    }
    .pptx-slide-root .edm-slide {
      aspect-ratio: unset;
      max-width: none;
    }
  `

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]

    // ── Build temp single-slide element (same technique as PDF export) ──
    const root = document.createElement('div')
    root.className = 'pptx-slide-root'

    const style = document.createElement('style')
    style.textContent = sharedCss
    root.appendChild(style)

    // Measurement div
    const measure = document.createElement('div')
    measure.className = `edm-preview edm-slide edm-slide-${slide.template}`
    measure.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0;
      height: auto; overflow: visible;
      visibility: hidden; pointer-events: none;
    `
    measure.innerHTML = slide.html
    root.appendChild(measure)

    // Visible div
    const visible = document.createElement('div')
    visible.className = `edm-preview edm-slide edm-slide-${slide.template}`
    visible.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      background: ${theme.bg};
      overflow: hidden;
    `
    visible.innerHTML = slide.html
    root.appendChild(visible)

    document.body.appendChild(root)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    // ── Auto-fit / manual zoom (same as PresentationPreview) ──
    const contentH = measure.offsetHeight
    const autoScale = contentH > 0 ? Math.min(slideHeightPx / contentH, 1) : 1

    const storeZoom = slideZoomOverrides?.get(i)
    const metaZoom = slide.metadata?.zoom ? parseFloat(slide.metadata.zoom) : undefined
    const manualZoom = storeZoom ?? (Number.isFinite(metaZoom) ? metaZoom : undefined)
    const scale = manualZoom ?? autoScale

    visible.style.width = `${100 / scale}%`
    visible.style.height = `${100 / scale}%`
    visible.style.transform = `scale(${scale})`
    visible.style.transformOrigin = 'top left'
    measure.remove()

    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    // ── Render to canvas ──
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      width: slideWidthPx,
      height: slideHeightPx,
      windowWidth: slideWidthPx,
      windowHeight: slideHeightPx,
    })

    // ── Add as PPTX slide image ──
    const pptxSlide = pptx.addSlide()
    const imgData = canvas.toDataURL('image/png')
    pptxSlide.addImage({
      data: imgData,
      x: 0,
      y: 0,
      w: slideW,
      h: slideH,
    })

    document.body.removeChild(root)
  }

  await pptx.writeFile({
    fileName: filename.replace(/\.edm$/, '') + '.pptx',
  })
}
