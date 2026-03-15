import type { ThemeConfig } from '@/types/theme'
import type { Slide } from '@/types/contentMode'
import { generateThemeCss } from '@/components/preview/previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import presentationCssRaw from '@/styles/presentation.css?raw'

/**
 * Generates a standalone HTML presentation with slides as <section> elements
 * and minimal JS for keyboard/button navigation.
 */
export function exportPresentationHtml(
  slides: Slide[],
  theme: ThemeConfig,
  title: string
): string {
  const themeCssVars = generateThemeCss(theme)

  const slideSections = slides
    .map(
      (slide, i) =>
        `<section class="slide edm-preview edm-slide edm-slide-${slide.template}" data-slide="${i}">\n${slide.html}\n</section>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #111; overflow: hidden; font-family: sans-serif; }

    .edm-preview { ${themeCssVars} }
    ${previewBaseCss}
    ${presentationCssRaw}
    ${theme.customCss || ''}

    .slide {
      position: absolute;
      inset: 0;
      display: none;
      background: ${theme.bg};
    }
    .slide.active { display: flex; }

    .slide-container {
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .slide-nav {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0,0,0,0.6);
      padding: 8px 16px;
      border-radius: 999px;
      color: white;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 10;
    }
    .slide-container:hover .slide-nav { opacity: 1; }

    .slide-nav button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 16px;
      border-radius: 4px;
    }
    .slide-nav button:hover { background: rgba(255,255,255,0.2); }
  </style>
</head>
<body>
  <div class="slide-container">
    ${slideSections}
    <div class="slide-nav">
      <button onclick="prev()">&larr;</button>
      <span id="counter">1 / ${slides.length}</span>
      <button onclick="next()">&rarr;</button>
    </div>
  </div>
  <script>
    let current = 0;
    const slides = document.querySelectorAll('.slide');
    const counter = document.getElementById('counter');
    function show(i) {
      slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
      counter.textContent = (i + 1) + ' / ' + slides.length;
    }
    function next() { if (current < slides.length - 1) show(++current); }
    function prev() { if (current > 0) show(--current); }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
    });
    show(0);
  </script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
