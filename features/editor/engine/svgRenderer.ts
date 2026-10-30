/**
 * Professional Icon Editor - Pure SVG Rendering Engine
 * Architecture Layer: Renderer (Independent of UI DOM, deterministic output)
 */

import type {
  EditorDocument,
  EditorElement,
  RectElement,
  CircleElement,
  EllipseElement,
  LineElement,
  PolygonElement,
  PathElement,
  TextElement,
  ImageElement
} from '../types/editor'

export interface RenderSvgOptions {
  includeBackground?: boolean
  includeReferences?: boolean
  customWidth?: number
  customHeight?: number
}

export class SvgRenderer {
  /**
   * Renders an entire EditorDocument into a standard, clean SVG string.
   */
  public static renderToSvg(doc: EditorDocument, options: RenderSvgOptions = {}): string {
    const {
      includeBackground = true,
      includeReferences = false,
      customWidth,
      customHeight
    } = options

    const width = customWidth || doc.width
    const height = customHeight || doc.height
    const viewBox = `${doc.viewBox.minX} ${doc.viewBox.minY} ${doc.viewBox.width} ${doc.viewBox.height}`

    const parts: string[] = []
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" version="1.1">`)

    // Background layer
    if (includeBackground && doc.background && doc.background !== 'transparent') {
      parts.push(`  <rect width="${doc.width}" height="${doc.height}" fill="${this.escapeAttr(doc.background)}" />`)
    }

    // Render visible elements in order (bottom to top)
    for (const el of doc.elements) {
      if (!el.visible) continue
      if (el.type === 'image' && (el as ImageElement).isReference && !includeReferences) {
        continue
      }

      const elementSvg = this.renderElement(el)
      if (elementSvg) {
        parts.push(`  ${elementSvg}`)
      }
    }

    parts.push('</svg>')
    return parts.join('\n')
  }

  /**
   * Renders a single EditorElement into an SVG tag.
   */
  public static renderElement(el: EditorElement): string {
    const transform = this.buildTransformAttr(el)
    const opacityAttr = el.opacity < 1 ? ` opacity="${el.opacity.toFixed(2)}"` : ''

    switch (el.type) {
      case 'rect': {
        const r = el as RectElement
        const rxAttr = r.rx > 0 ? ` rx="${r.rx}"` : ''
        const ryAttr = r.ry > 0 ? ` ry="${r.ry}"` : ''
        return `<rect id="${r.id}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"${rxAttr}${ryAttr} fill="${this.escapeAttr(r.fill)}" stroke="${this.escapeAttr(r.stroke)}" stroke-width="${r.strokeWidth}"${opacityAttr}${transform} />`
      }

      case 'circle': {
        const c = el as CircleElement
        return `<circle id="${c.id}" cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${this.escapeAttr(c.fill)}" stroke="${this.escapeAttr(c.stroke)}" stroke-width="${c.strokeWidth}"${opacityAttr}${transform} />`
      }

      case 'ellipse': {
        const e = el as EllipseElement
        return `<ellipse id="${e.id}" cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${this.escapeAttr(e.fill)}" stroke="${this.escapeAttr(e.stroke)}" stroke-width="${e.strokeWidth}"${opacityAttr}${transform} />`
      }

      case 'line': {
        const l = el as LineElement
        return `<line id="${l.id}" x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${this.escapeAttr(l.stroke)}" stroke-width="${l.strokeWidth}" stroke-linecap="${l.strokeLinecap}"${opacityAttr}${transform} />`
      }

      case 'polygon': {
        const p = el as PolygonElement
        const pts = p.points.map(pt => `${pt.x},${pt.y}`).join(' ')
        return `<polygon id="${p.id}" points="${pts}" fill="${this.escapeAttr(p.fill)}" stroke="${this.escapeAttr(p.stroke)}" stroke-width="${p.strokeWidth}"${opacityAttr}${transform} />`
      }

      case 'path': {
        const p = el as PathElement
        return `<path id="${p.id}" d="${this.escapeAttr(p.pathData)}" fill="${this.escapeAttr(p.fill)}" stroke="${this.escapeAttr(p.stroke)}" stroke-width="${p.strokeWidth}" stroke-linecap="${p.strokeLinecap}" stroke-linejoin="${p.strokeLinejoin}"${opacityAttr}${transform} />`
      }

      case 'text': {
        const t = el as TextElement
        const textAnchor = t.textAlign === 'center' ? 'middle' : t.textAlign === 'right' ? 'end' : 'start'
        const strokeAttr = t.stroke && t.stroke !== 'none' ? ` stroke="${this.escapeAttr(t.stroke)}" stroke-width="${t.strokeWidth || 1}"` : ''
        return `<text id="${t.id}" x="${t.x}" y="${t.y}" font-size="${t.fontSize}" font-family="${this.escapeAttr(t.fontFamily)}" font-weight="${t.fontWeight}" text-anchor="${textAnchor}" fill="${this.escapeAttr(t.fill)}"${strokeAttr}${opacityAttr}${transform}>${this.escapeText(t.text)}</text>`
      }

      case 'image': {
        const img = el as ImageElement
        return `<image id="${img.id}" href="${this.escapeAttr(img.href)}" x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" preserveAspectRatio="xMidYMid meet"${opacityAttr}${transform} />`
      }

      default:
        return ''
    }
  }

  private static buildTransformAttr(el: EditorElement): string {
    if (!el.rotation || el.rotation === 0) return ''

    // Compute center of element for rotation origin
    let cx = 0
    let cy = 0

    if ('cx' in el && typeof el.cx === 'number') {
      cx = el.cx
      cy = el.cy
    } else if ('x' in el && typeof el.x === 'number') {
      const width = 'width' in el && typeof el.width === 'number' ? el.width : 0
      const height = 'height' in el && typeof el.height === 'number' ? el.height : 0
      cx = el.x + width / 2
      cy = el.y + height / 2
    }

    return ` transform="rotate(${el.rotation.toFixed(1)}, ${cx.toFixed(1)}, ${cy.toFixed(1)})"`
  }

  private static escapeAttr(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  private static escapeText(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
}
