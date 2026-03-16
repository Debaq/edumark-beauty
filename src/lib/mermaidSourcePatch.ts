/**
 * Utilities to locate and replace Mermaid code inside :::diagram blocks in .edm source.
 */

interface MermaidBlockLocation {
  /** Character offset where the Mermaid content starts (after the ```mermaid line) */
  start: number
  /** Character offset where the Mermaid content ends (before the closing ```) */
  end: number
  /** The Mermaid code string */
  code: string
}

/**
 * Find the Mermaid code block inside a :::diagram with the given id.
 * Returns null if not found or the diagram doesn't contain a Mermaid fence.
 */
export function findDiagramMermaidBlock(source: string, diagramId: string): MermaidBlockLocation | null {
  const lines = source.split('\n')
  let offset = 0
  let inTargetBlock = false
  let inMermaidFence = false
  let mermaidStart = -1
  let blockDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineStart = offset
    offset += line.length + 1

    if (!inTargetBlock && /^:{3,}\s*diagram\b/.test(line)) {
      const idMatch = line.match(/id\s*=\s*"([^"]*)"/)
      if (idMatch && idMatch[1] === diagramId) {
        inTargetBlock = true
        blockDepth = 1
        continue
      }
    }

    if (!inTargetBlock) continue

    if (/^:{3,}\s*\S+/.test(line)) {
      blockDepth++
      continue
    }
    if (/^:{3,}\s*$/.test(line)) {
      blockDepth--
      if (blockDepth <= 0) break
      continue
    }

    if (!inMermaidFence && /^```mermaid\s*$/.test(line)) {
      inMermaidFence = true
      mermaidStart = offset
      continue
    }

    if (inMermaidFence && /^```\s*$/.test(line)) {
      const mermaidEnd = lineStart
      const code = source.slice(mermaidStart, mermaidEnd)
      return {
        start: mermaidStart,
        end: mermaidEnd,
        code: code.endsWith('\n') ? code.slice(0, -1) : code,
      }
    }
  }

  return null
}

/**
 * Replace the Mermaid code inside a :::diagram block with new code.
 * Returns the original source unchanged if the diagram/Mermaid block is not found.
 */
export function replaceDiagramMermaid(source: string, diagramId: string, newCode: string): string {
  const loc = findDiagramMermaidBlock(source, diagramId)
  if (!loc) return source

  const codeWithNewline = newCode.endsWith('\n') ? newCode : newCode + '\n'
  return source.slice(0, loc.start) + codeWithNewline + source.slice(loc.end)
}
