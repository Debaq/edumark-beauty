/**
 * Convert an image File/Blob to a WebP (or JPEG fallback) base64 data URI.
 *
 * - Scales the image so its largest dimension ≤ maxDimension
 * - Encodes as WebP at the given quality (falls back to JPEG if WebP unsupported)
 * - Returns a complete data URI string: `data:image/webp;base64,...`
 */
export async function imageToWebpBase64(
  file: File | Blob,
  maxDimension = 1200,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Scale down if needed
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

  // Try WebP first, fall back to JPEG
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
