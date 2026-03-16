import { isTauri } from '@/lib/fileAdapter'
import QRCode from 'qrcode'

/** Generate a QR data URL — uses Rust in Tauri, qrcode.js in web */
async function generateQR(text: string): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<string>('generate_qr', { text, size: 120 })
    } catch {
      // Fall through to JS
    }
  }
  return QRCode.toDataURL(text, {
    width: 120,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

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

    const qrSlot = el.querySelector<HTMLElement>('.edm-embed-qr')
    if (qrSlot) {
      try {
        const dataUrl = await generateQR(src)
        const img = document.createElement('img')
        img.src = dataUrl
        img.alt = `QR: ${src}`
        img.width = 120
        img.height = 120
        qrSlot.appendChild(img)
      } catch {
        qrSlot.textContent = '[QR]'
      }
    }

    el.classList.add('edm-embed-print-visible')
    const frame = el.parentElement?.querySelector<HTMLElement>('.edm-embed-frame')
    if (frame) frame.style.display = 'none'
  }
}
