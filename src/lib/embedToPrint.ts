import QRCode from 'qrcode'

/**
 * Replaces embed iframes with QR code + description for print/PDF export.
 * Finds all .edm-embed-print elements, generates a QR for each data-embed-src,
 * hides the iframe container, and makes the print fallback visible.
 */
export async function replaceEmbedsForPrint(root: HTMLElement): Promise<void> {
  const embeds = root.querySelectorAll<HTMLElement>('.edm-embed-print[data-embed-src]')

  for (const el of embeds) {
    const src = el.getAttribute('data-embed-src')
    if (!src) continue

    // Generate QR as data URL
    const qrSlot = el.querySelector<HTMLElement>('.edm-embed-qr')
    if (qrSlot) {
      try {
        const dataUrl = await QRCode.toDataURL(src, {
          width: 120,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })
        const img = document.createElement('img')
        img.src = dataUrl
        img.alt = `QR: ${src}`
        img.width = 120
        img.height = 120
        qrSlot.appendChild(img)
      } catch {
        // Fallback: show URL text if QR fails
        qrSlot.textContent = '[QR]'
      }
    }

    // Show print fallback, hide iframe
    el.classList.add('edm-embed-print-visible')
    const frame = el.parentElement?.querySelector<HTMLElement>('.edm-embed-frame')
    if (frame) frame.style.display = 'none'
  }
}
