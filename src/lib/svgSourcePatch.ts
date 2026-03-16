/**
 * Utilities to locate and replace SVG code inside :::diagram blocks in .edm source.
 */

interface SvgBlockLocation {
  /** Character offset where the SVG content starts (after the ```svg line) */
  start: number
  /** Character offset where the SVG content ends (before the closing ```) */
  end: number
  /** The SVG code string */
  svgCode: string
}

/**
 * Find the SVG code block inside a :::diagram with the given id.
 * Returns null if not found or the diagram doesn't contain an SVG fence.
 */
export function findDiagramSvgBlock(source: string, diagramId: string): SvgBlockLocation | null {
  const lines = source.split('\n')
  let offset = 0
  let inTargetBlock = false
  let inSvgFence = false
  let svgStart = -1
  let blockDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineStart = offset
    offset += line.length + 1 // +1 for \n

    // Detect :::diagram opening with matching id
    if (!inTargetBlock && /^:{3,}\s*diagram\b/.test(line)) {
      const idMatch = line.match(/id\s*=\s*"([^"]*)"/)
      if (idMatch && idMatch[1] === diagramId) {
        inTargetBlock = true
        blockDepth = 1
        continue
      }
    }

    if (!inTargetBlock) continue

    // Track nested ::: blocks
    if (/^:{3,}\s*\S+/.test(line)) {
      blockDepth++
      continue
    }
    if (/^:{3,}\s*$/.test(line)) {
      blockDepth--
      if (blockDepth <= 0) {
        // Block closed without finding SVG
        break
      }
      continue
    }

    // Look for ```svg fence opening
    if (!inSvgFence && /^```svg\s*$/.test(line)) {
      inSvgFence = true
      svgStart = offset // Start of next line
      continue
    }

    // Look for ``` fence closing
    if (inSvgFence && /^```\s*$/.test(line)) {
      const svgEnd = lineStart // End is start of closing fence line
      const svgCode = source.slice(svgStart, svgEnd)
      return {
        start: svgStart,
        end: svgEnd,
        svgCode: svgCode.endsWith('\n') ? svgCode.slice(0, -1) : svgCode,
      }
    }
  }

  return null
}

/**
 * Replace the SVG code inside a :::diagram block with new SVG content.
 * Returns the original source unchanged if the diagram/SVG is not found.
 */
export function replaceDiagramSvg(source: string, diagramId: string, newSvg: string): string {
  const loc = findDiagramSvgBlock(source, diagramId)
  if (!loc) return source

  // Ensure newSvg ends with a newline for proper fence formatting
  const svgWithNewline = newSvg.endsWith('\n') ? newSvg : newSvg + '\n'
  return source.slice(0, loc.start) + svgWithNewline + source.slice(loc.end)
}
