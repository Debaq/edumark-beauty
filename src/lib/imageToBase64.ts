import { isTauri } from '@/lib/fileAdapter'

/**
 * Convert an image File/Blob to a WebP (or JPEG fallback) base64 data URI.
 *
 * - Tauri: uses Rust (image crate) for fast encoding
 * - Web: uses OffscreenCanvas + convertToBlob
 */
export async function imageToWebpBase64(
  file: File | Blob,
  maxDimension = 1200,
  quality = 0.82,
): Promise<string> {
  // Tauri: delegate to Rust
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const buffer = await file.arrayBuffer()
      const data = Array.from(new Uint8Array(buffer))
      const result = await invoke<string>('compress_image', {
        data,
        maxDimension,
        quality,
      })
      return result
    } catch {
      // Fall through to web implementation
    }
  }

  // Web implementation
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  let w = width
  let h = height
  if (w > maxDimension || h > maxDimension) {
    const ratio = maxDimension / Math.max(w, h)
    w = Math.round(w * ratio)
    h = Math.round(h * ratio)
  }

  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  let blob = await canvas.convertToBlob({ type: 'image/webp', quality })
  if (blob.type !== 'image/webp') {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image blob'))
    reader.readAsDataURL(blob)
  })
}
