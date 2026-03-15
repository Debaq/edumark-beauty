import type { ThemeConfig } from '@/types/theme'
import type { Slide, SlideConfig } from '@/types/contentMode'
import { generateThemeCss } from '@/components/preview/previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import presentationCssRaw from '@/styles/presentation.css?raw'
import { interactivityScript, interactivityCss } from '@/lib/interactivity'

/**
 * Generates a standalone HTML presentation with slides,
 * auto-fit scaling, keyboard/button/touch navigation,
 * and correct aspect ratio + container queries.
 */
export function exportPresentationHtml(
  slides: Slide[],
  theme: ThemeConfig,
  slideConfig: SlideConfig,
  title: string
): string {
  const themeCssVars = generateThemeCss(theme)

  const ratio =
    slideConfig.ratio === '16:9' ? '16/9'
    : slideConfig.ratio === '4:3' ? '4/3'
    : `${slideConfig.customWidth ?? 16}/${slideConfig.customHeight ?? 9}`

  const [rw, rh] = ratio.split('/').map(Number)

  const slideSections = slides
    .map(
      (slide, i) =>
        `<section class="slide edm-preview edm-slide edm-slide-${slide.template}"${i === 0 ? ' data-active' : ''}>\n${slide.html}\n</section>`
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

    body {
      margin: 0;
      background: #000;
      overflow: hidden;
      font-family: sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .edm-preview { ${themeCssVars} }
    ${previewBaseCss}
    ${presentationCssRaw}
    ${interactivityCss}
    ${theme.customCss || ''}

    /* ── Layout ────────────────────────────────── */
    .slide-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .slide-viewport {
      container-type: inline-size;
      position: relative;
      overflow: hidden;
      width: min(100vw, calc(100vh * ${rw} / ${rh}));
      height: min(100vh, calc(100vw * ${rh} / ${rw}));
    }

    .slide {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${theme.bg};
    }

    .slide:not([data-active]) { display: none !important; }

    /* ── Navigation bar ────────────────────────── */
    .slide-nav {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(8px);
      padding: 8px 20px;
      border-radius: 999px;
      color: white;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 10;
      user-select: none;
    }
    body:hover .slide-nav,
    body.touch .slide-nav { opacity: 1; }

    .slide-nav button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px 10px;
      font-size: 18px;
      border-radius: 6px;
      line-height: 1;
    }
    .slide-nav button:hover { background: rgba(255,255,255,0.2); }
    .slide-nav button:disabled { opacity: 0.3; cursor: default; }
  </style>
</head>
<body>
  <div class="slide-container">
    <div class="slide-viewport">
      ${slideSections}
    </div>
    <div class="slide-nav">
      <button id="btn-prev" aria-label="Anterior">&larr;</button>
      <span id="counter">1 / ${slides.length}</span>
      <button id="btn-next" aria-label="Siguiente">&rarr;</button>
    </div>
  </div>
  <script>
    (function(){
      var current = 0;
      var slides = document.querySelectorAll('.slide');
      var total = slides.length;
      var counter = document.getElementById('counter');
      var btnPrev = document.getElementById('btn-prev');
      var btnNext = document.getElementById('btn-next');
      var viewport = document.querySelector('.slide-viewport');

      function show(i) {
        var j, s, contentH, vpH, scale;

        /* reset all */
        for (j = 0; j < total; j++) {
          slides[j].removeAttribute('data-active');
          slides[j].style.cssText = '';
        }

        s = slides[i];
        s.setAttribute('data-active', '');

        /* phase 1 — measure natural content height (with details open) */
        s.style.cssText =
          'position:absolute;top:0;left:0;right:0;bottom:auto;' +
          'height:auto;overflow:visible;visibility:hidden;';
        var dets = s.querySelectorAll('details:not([open])');
        for (var d = 0; d < dets.length; d++) dets[d].setAttribute('open', '');
        contentH = s.offsetHeight;
        for (var d = 0; d < dets.length; d++) dets[d].removeAttribute('open');
        vpH = viewport.clientHeight;

        /* phase 2 — apply auto-fit scale */
        scale = contentH > vpH ? vpH / contentH : 1;
        s.style.cssText =
          'position:absolute;top:0;left:0;right:auto;bottom:auto;' +
          'width:' + (100 / scale) + '%;' +
          'height:' + (100 / scale) + '%;' +
          'transform:scale(' + scale + ');' +
          'transform-origin:top left;';

        counter.textContent = (i + 1) + ' / ' + total;
        btnPrev.disabled = i === 0;
        btnNext.disabled = i === total - 1;
      }

      function next() { if (current < total - 1) show(++current); }
      function prev() { if (current > 0) show(--current); }

      btnPrev.addEventListener('click', prev);
      btnNext.addEventListener('click', next);

      document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
        if (e.key === 'Home') { e.preventDefault(); current = 0; show(0); }
        if (e.key === 'End')  { e.preventDefault(); current = total - 1; show(total - 1); }
      });

      /* touch swipe */
      var startX = 0;
      document.addEventListener('touchstart', function(e) {
        startX = e.changedTouches[0].clientX;
        document.body.classList.add('touch');
      });
      document.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - startX;
        if (dx > 50) prev();
        else if (dx < -50) next();
      });

      /* initial render + re-measure after fonts load + on resize */
      show(0);
      document.fonts.ready.then(function() { show(current); });
      window.addEventListener('resize', function() { show(current); });
    })();
  </script>
  <script>${interactivityScript}</script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
