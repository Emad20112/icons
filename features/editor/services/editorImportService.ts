/**
 * Professional Icon Editor - Import Service
 * Architecture Layer: Application Service (Safe SVG Parsing, Element Conversion, Image Reference)
 */

import type { EditorCore } from '../engine/editorCore'
import type { EditorElement } from '../types/editor'
import { sanitizeSvgContent } from '../../../lib/sanitizer/svgSanitizer'
import { validateImageFile } from '../../image-converter/utils/fileValidator'

export interface SvgImportResult {
  success: boolean
  importedCount: number
  warnings: string[]
  error?: string
}

interface SvgElementLike {
  tagName: string
  getAttribute: (name: string) => string | null
  textContent?: string | null
}

export class EditorImportService {
  /**
   * Safely imports an SVG file/string into editable EditorElements inside the document.
   */
  public static async importSvgString(svgContent: string, core: EditorCore): Promise<SvgImportResult> {
    const warnings: string[] = []

    if (!svgContent || typeof svgContent !== 'string' || svgContent.trim() === '') {
      return { success: false, importedCount: 0, warnings, error: 'Empty or invalid SVG content.' }
    }

    try {
      // 1. Sanitize against script injection and XSS
      const sanitized = sanitizeSvgContent(svgContent)

      // 2. Parse SVG into elements (isomorphic: DOMParser in browser, regex-safe parser in Node/SSR)
      const parsed = this.parseSvgStructure(sanitized)
      if (parsed.error) {
        return { success: false, importedCount: 0, warnings, error: parsed.error }
      }

      // 3. Inspect viewBox and adapt dimensions
      if (parsed.viewBox) {
        const parts = parsed.viewBox.trim().split(/[\s,]+/).map(Number)
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          if (core.getDocument().elements.length === 0) {
            core.setCanvasDimensions(parts[2], parts[3])
          }
        }
      }

      // 4. Extract child shape nodes
      const elements: EditorElement[] = []
      for (let i = 0; i < parsed.nodes.length; i++) {
        const el = this.convertSvgNodeToElement(parsed.nodes[i], i + 1)
        if (el) {
          elements.push(el)
        }
      }

      if (elements.length === 0) {
        return {
          success: false,
          importedCount: 0,
          warnings: ['No standard vector shapes (<path>, <rect>, <circle>, etc.) were found in this SVG.'],
          error: 'No recognizable vector elements in SVG.'
        }
      }

      // 5. Add all imported elements into editor core
      for (const el of elements) {
        core.addElement(el)
      }

      return {
        success: true,
        importedCount: elements.length,
        warnings
      }
    } catch (err: any) {
      return {
        success: false,
        importedCount: 0,
        warnings,
        error: err?.message || 'Failed to import SVG.'
      }
    }
  }

  private static parseSvgStructure(svgString: string): {
    viewBox: string | null
    nodes: SvgElementLike[]
    error?: string
  } {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgString, 'image/svg+xml')
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        return { viewBox: null, nodes: [], error: `SVG parse error: ${parseError.textContent}` }
      }
      const svgEl = doc.querySelector('svg')
      if (!svgEl) {
        return { viewBox: null, nodes: [], error: 'No root <svg> element found.' }
      }
      const viewBox = svgEl.getAttribute('viewBox')
      const shapeNodes = svgEl.querySelectorAll('rect, circle, ellipse, line, polygon, path, text')
      const nodes: SvgElementLike[] = []
      for (let i = 0; i < shapeNodes.length; i++) {
        const n = shapeNodes[i] as SVGElement
        nodes.push({
          tagName: n.tagName.toLowerCase(),
          getAttribute: (attr: string) => n.getAttribute(attr),
          textContent: n.textContent
        })
      }
      return { viewBox, nodes }
    }

    // Node.js / Testing environment fallback
    const svgMatch = svgString.match(/<svg\b([^>]*)>/i)
    if (!svgMatch) {
      return { viewBox: null, nodes: [], error: 'No root <svg> element found.' }
    }

    const svgAttrs = svgMatch[1]
    const viewBoxMatch = svgAttrs.match(/viewBox=["']([^"']+)["']/i)
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : null

    const nodes: SvgElementLike[] = []
    const tagRegex = /<(rect|circle|ellipse|line|polygon|path|text)\b([^>]*)(?:\/?>([\s\S]*?)<\/\1>|\/?>)/gi
    let match: RegExpExecArray | null

    while ((match = tagRegex.exec(svgString)) !== null) {
      const tagName = match[1].toLowerCase()
      const attrString = match[2]
      const innerContent = match[3] || ''

      const getAttribute = (name: string): string | null => {
        const attrRegex = new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i')
        const attrMatch = attrString.match(attrRegex)
        return attrMatch ? attrMatch[1] : null
      }

      nodes.push({
        tagName,
        getAttribute,
        textContent: innerContent.replace(/<[^>]+>/g, '').trim()
      })
    }

    return { viewBox, nodes }
  }

  /**
   * Imports a raster image as a background reference guide layer.
   */
  public static async importImageAsReference(
    file: File,
    core: EditorCore
  ): Promise<{ success: boolean; error?: string }> {
    const validation = await validateImageFile(file)
    if (!validation.isValid) {
      return { success: false, error: validation.error || 'Invalid image file.' }
    }

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        if (!dataUrl) {
          resolve({ success: false, error: 'Failed to read image data.' })
          return
        }

        const img = new Image()
        img.onload = () => {
          const doc = core.getDocument()
          // Center and fit within canvas
          const scale = Math.min(doc.width / img.width, doc.height / img.height)
          const targetW = Math.round(img.width * scale)
          const targetH = Math.round(img.height * scale)
          const posX = Math.round((doc.width - targetW) / 2)
          const posY = Math.round((doc.height - targetH) / 2)

          const refLayer = core.createImage(dataUrl, posX, posY, targetW, targetH, true)
          // Insert at the bottom of the layer stack
          core.addElement(refLayer, 0)
          resolve({ success: true })
        }
        img.onerror = () => {
          resolve({ success: false, error: 'Failed to decode image.' })
        }
        img.src = dataUrl
      }
      reader.onerror = () => resolve({ success: false, error: 'File read error.' })
      reader.readAsDataURL(file)
    })
  }

  private static convertSvgNodeToElement(node: SvgElementLike, index: number): EditorElement | null {
    const tagName = node.tagName.toLowerCase()
    const fill = node.getAttribute('fill') || '#0f172a'
    const stroke = node.getAttribute('stroke') || 'none'
    const strokeWidth = Number(node.getAttribute('stroke-width')) || 0
    const opacity = Number(node.getAttribute('opacity')) || 1
    const id = `import_${Math.random().toString(36).substr(2, 9)}`

    switch (tagName) {
      case 'rect': {
        const x = Number(node.getAttribute('x')) || 0
        const y = Number(node.getAttribute('y')) || 0
        const width = Number(node.getAttribute('width')) || 32
        const height = Number(node.getAttribute('height')) || 32
        const rx = Number(node.getAttribute('rx')) || 0
        const ry = Number(node.getAttribute('ry')) || 0
        return {
          id,
          name: `Rectangle ${index}`,
          type: 'rect',
          x,
          y,
          width,
          height,
          rx,
          ry,
          fill: fill === 'none' && stroke === 'none' ? '#2563eb' : fill,
          stroke,
          strokeWidth,
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      case 'circle': {
        const cx = Number(node.getAttribute('cx')) || 0
        const cy = Number(node.getAttribute('cy')) || 0
        const r = Number(node.getAttribute('r')) || 16
        return {
          id,
          name: `Circle ${index}`,
          type: 'circle',
          cx,
          cy,
          r,
          fill: fill === 'none' && stroke === 'none' ? '#3b82f6' : fill,
          stroke,
          strokeWidth,
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      case 'ellipse': {
        const cx = Number(node.getAttribute('cx')) || 0
        const cy = Number(node.getAttribute('cy')) || 0
        const rx = Number(node.getAttribute('rx')) || 20
        const ry = Number(node.getAttribute('ry')) || 12
        return {
          id,
          name: `Ellipse ${index}`,
          type: 'ellipse',
          cx,
          cy,
          rx,
          ry,
          fill: fill === 'none' && stroke === 'none' ? '#60a5fa' : fill,
          stroke,
          strokeWidth,
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      case 'line': {
        const x1 = Number(node.getAttribute('x1')) || 0
        const y1 = Number(node.getAttribute('y1')) || 0
        const x2 = Number(node.getAttribute('x2')) || 0
        const y2 = Number(node.getAttribute('y2')) || 0
        return {
          id,
          name: `Line ${index}`,
          type: 'line',
          x1,
          y1,
          x2,
          y2,
          stroke: stroke === 'none' ? '#0f172a' : stroke,
          strokeWidth: strokeWidth || 2,
          strokeLinecap: 'round',
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      case 'polygon': {
        const rawPoints = node.getAttribute('points') || ''
        const pointPairs = rawPoints.trim().split(/[\s,]+/).map(Number)
        const points: Array<{ x: number; y: number }> = []
        for (let i = 0; i < pointPairs.length; i += 2) {
          if (!isNaN(pointPairs[i]) && !isNaN(pointPairs[i + 1])) {
            points.push({ x: pointPairs[i], y: pointPairs[i + 1] })
          }
        }
        return {
          id,
          name: `Polygon ${index}`,
          type: 'polygon',
          points,
          sides: points.length,
          fill: fill === 'none' && stroke === 'none' ? '#f59e0b' : fill,
          stroke,
          strokeWidth,
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      case 'path': {
        const pathData = node.getAttribute('d') || ''
        if (!pathData) return null
        return {
          id,
          name: `Path ${index}`,
          type: 'path',
          pathData,
          fill: fill === 'none' && stroke === 'none' ? '#10b981' : fill,
          stroke,
          strokeWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      case 'text': {
        const text = node.textContent?.trim() || 'Text'
        const x = Number(node.getAttribute('x')) || 10
        const y = Number(node.getAttribute('y')) || 24
        const fontSize = Number(node.getAttribute('font-size')) || 20
        return {
          id,
          name: `Text ${index}`,
          type: 'text',
          text,
          x,
          y,
          fontSize,
          fontFamily: node.getAttribute('font-family') || 'system-ui, sans-serif',
          fontWeight: node.getAttribute('font-weight') || 'normal',
          textAlign: 'left',
          fill: fill === 'none' ? '#0f172a' : fill,
          stroke,
          strokeWidth,
          opacity,
          rotation: 0,
          visible: true,
          locked: false
        }
      }

      default:
        return null
    }
  }
}
