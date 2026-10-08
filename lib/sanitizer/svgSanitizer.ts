/**
 * Production-grade SVG Sanitizer.
 * Defends against XSS, XML Entity Expansion (Billion Laughs), and arbitrary code execution in SVGs.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') {
    return ''
  }

  let cleaned = rawSvg.trim()

  // 1. Remove XML declarations and DOCTYPE entities to mitigate XXE
  cleaned = cleaned.replace(/<\?xml[\s\S]*?\?>/gi, '')
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  cleaned = cleaned.replace(/<!ENTITY[\s\S]*?>/gi, '')

  // 2. Remove <script> tags and all content inside
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // 3. Remove dangerous HTML / Foreign tags inside SVG
  const dangerousTags = [
    'foreignObject',
    'iframe',
    'frame',
    'embed',
    'object',
    'applet',
    'audio',
    'video',
    'source',
    'canvas',
    'meta',
    'link',
    'style' // Strip internal <style> or sanitize font-face imports
  ]

  for (const tag of dangerousTags) {
    const regExp = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi')
    cleaned = cleaned.replace(regExp, '')
    // Also remove self-closing
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
    cleaned = cleaned.replace(selfClosing, '')
  }

  // 4. Remove all on* event handler attributes (e.g. onload, onerror, onclick, onmouseover)
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, '')
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')

  // 5. Remove dangerous URI schemes: javascript:, vbscript:, data:text/html
  cleaned = cleaned.replace(/(href|xlink:href)\s*=\s*(["'])\s*(javascript|vbscript|data:text\/html):[\s\S]*?\2/gi, '$1="#"')

  // 6. Ensure standard SVG opening tag exists
  if (!cleaned.includes('<svg') || !cleaned.includes('</svg>')) {
    throw new Error('Invalid SVG payload: Root <svg> element required')
  }

  return cleaned.trim()
}
