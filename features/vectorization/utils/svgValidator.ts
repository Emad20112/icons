import { sanitizeSvg } from '../../../lib/sanitizer/svgSanitizer'
import type { VectorizationValidationResult } from '../types/vectorization'

export interface TrueVectorCheckResult {
  isTrueVector: boolean
  hasPaths: boolean
  hasEmbeddedRaster: boolean
  pathCount: number
  nodeCount: number
  colors: Set<string>
  errors: string[]
  warnings: string[]
}

/**
 * Validates that an SVG contains genuine vector paths, polygons, or shapes
 * and is NOT simply an SVG wrapper around a base64 or embedded raster image.
 */
export function validateTrueVectorSvg(rawSvg: string): TrueVectorCheckResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!rawSvg || typeof rawSvg !== 'string' || !rawSvg.trim()) {
    return {
      isTrueVector: false,
      hasPaths: false,
      hasEmbeddedRaster: false,
      pathCount: 0,
      nodeCount: 0,
      colors: new Set(),
      errors: ['Empty or non-string SVG payload']
    }
  }

  const trimmed = rawSvg.trim()

  // 1. Check for root SVG element
  if (!trimmed.includes('<svg') || !trimmed.includes('</svg>')) {
    errors.push('Missing valid root <svg> and </svg> tags')
  }

  // 2. Reject embedded raster images (<image tags or data:image URIs)
  const imageTagRegex = /<image\b/i
  const embeddedDataUriRegex = /xlink:href\s*=\s*["']data:image\/(?:png|jpeg|webp|gif)/i
  const hrefDataUriRegex = /href\s*=\s*["']data:image\/(?:png|jpeg|webp|gif)/i

  const hasEmbeddedRaster = imageTagRegex.test(trimmed) || embeddedDataUriRegex.test(trimmed) || hrefDataUriRegex.test(trimmed)
  if (hasEmbeddedRaster) {
    errors.push('SVG contains embedded raster <image> elements instead of true vector paths')
  }

  // 3. Count true vector paths and geometric elements
  const pathMatches = trimmed.match(/<path\b/gi) || []
  const polygonMatches = trimmed.match(/<polygon\b/gi) || []
  const rectMatches = trimmed.match(/<rect\b/gi) || []
  const circleMatches = trimmed.match(/<circle\b/gi) || []
  const polylineMatches = trimmed.match(/<polyline\b/gi) || []

  const totalVectorShapes = pathMatches.length + polygonMatches.length + rectMatches.length + circleMatches.length + polylineMatches.length
  const hasPaths = totalVectorShapes > 0

  if (!hasPaths) {
    errors.push('SVG does not contain any vector paths or shapes (<path>, <polygon>, <rect>, <circle>)')
  }

  // 4. Count approximate nodes from path command letters (M, L, Q, C, Z, S, T, A, H, V)
  let nodeCount = 0
  const pathDataMatches = trimmed.match(/d\s*=\s*["']([^"']+)["']/gi) || []
  for (const dAttr of pathDataMatches) {
    const commands = dAttr.match(/[MLQCZSTAHVmlqczstahv]/g) || []
    nodeCount += commands.length
  }

  // 5. Extract unique colors (fill and stroke)
  const colors = new Set<string>()
  const fillMatches = trimmed.match(/fill\s*=\s*["']([^"']+)["']/gi) || []
  for (const fill of fillMatches) {
    const val = fill.replace(/fill\s*=\s*["']/i, '').replace(/["']$/, '').trim()
    if (val && val !== 'none') {
      colors.add(val)
    }
  }
  const strokeMatches = trimmed.match(/stroke\s*=\s*["']([^"']+)["']/gi) || []
  for (const stroke of strokeMatches) {
    const val = stroke.replace(/stroke\s*=\s*["']/i, '').replace(/["']$/, '').trim()
    if (val && val !== 'none') {
      colors.add(val)
    }
  }

  // 6. Check for viewBox attribute
  if (!trimmed.includes('viewBox=')) {
    warnings.push('SVG does not have a viewBox attribute; scalability may be compromised')
  }

  const isTrueVector = errors.length === 0 && hasPaths && !hasEmbeddedRaster

  return {
    isTrueVector,
    hasPaths,
    hasEmbeddedRaster,
    pathCount: totalVectorShapes,
    nodeCount,
    colors,
    errors,
    warnings
  }
}

/**
 * Sanitizes and normalizes vector SVG markup for safe client rendering and export.
 */
export function cleanAndSanitizeVectorSvg(
  rawSvg: string,
  width?: number,
  height?: number
): string {
  // 1. Sanitize against XSS, script injection, and XXE
  let sanitized = sanitizeSvg(rawSvg)

  // 2. Ensure XMLNS namespace exists
  if (!sanitized.includes('xmlns=')) {
    sanitized = sanitized.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  // 3. Ensure viewBox is present if width & height are provided
  if (width && height && !sanitized.includes('viewBox=')) {
    sanitized = sanitized.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`)
  }

  return sanitized
}
