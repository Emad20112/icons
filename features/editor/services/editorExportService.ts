/**
 * Professional Icon Editor - Multi-format Export Service
 * Architecture Layer: Export Engine (SVG, High-res PNG, WebP, Windows ICO)
 */

import type { EditorDocument, ExportOptions } from '../types/editor'
import { SvgRenderer } from '../engine/svgRenderer'
import { encodeIco } from '../../image-converter/utils/icoEncoder'
import { sanitizeFilename } from '../../../lib/sanitizer/filenameSanitizer'

export interface ExportResult {
  blob: Blob
  fileName: string
  mimeType: string
}

export class EditorExportService {
  /**
   * Exports an EditorDocument into the requested file format.
   */
  public static async exportDocument(
    doc: EditorDocument,
    options: ExportOptions
  ): Promise<ExportResult> {
    const baseName = sanitizeFilename(options.fileName || doc.name || 'icon').replace(/\.[^/.]+$/, '')
    const format = options.format.toUpperCase()

    switch (format) {
      case 'SVG': {
        const svgString = SvgRenderer.renderToSvg(doc, {
          includeBackground: options.includeBackground,
          includeReferences: false,
          customWidth: options.width * options.scale,
          customHeight: options.height * options.scale
        })
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        return {
          blob,
          fileName: `${baseName}.svg`,
          mimeType: 'image/svg+xml'
        }
      }

      case 'PNG':
      case 'WEBP': {
        const mimeType = format === 'WEBP' ? 'image/webp' : 'image/png'
        const ext = format === 'WEBP' ? 'webp' : 'png'
        const targetWidth = Math.round(options.width * options.scale)
        const targetHeight = Math.round(options.height * options.scale)

        const canvas = await this.renderSvgToCanvas(doc, targetWidth, targetHeight, options.includeBackground)
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b)
              else reject(new Error(`Failed to encode ${format} image.`))
            },
            mimeType,
            options.quality || 0.95
          )
        })

        return {
          blob,
          fileName: `${baseName}.${ext}`,
          mimeType
        }
      }

      case 'ICO': {
        // Render target dimension ICO
        const primarySize = Math.min(Math.max(options.width, 16), 256)
        const canvas = await this.renderSvgToCanvas(doc, primarySize, primarySize, options.includeBackground)
        const pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b)
              else reject(new Error('Failed to encode PNG for ICO.'))
            },
            'image/png'
          )
        })
        const buffer = await pngBlob.arrayBuffer()
        const icoBytes = encodeIco([
          {
            width: primarySize,
            height: primarySize,
            pngBytes: new Uint8Array(buffer)
          }
        ])
        const blob = new Blob([icoBytes.buffer as ArrayBuffer], { type: 'image/x-icon' })

        return {
          blob,
          fileName: `${baseName}.ico`,
          mimeType: 'image/x-icon'
        }
      }

      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Helper to render an EditorDocument SVG into an offscreen HTMLCanvasElement.
   */
  public static async renderSvgToCanvas(
    doc: EditorDocument,
    width: number,
    height: number,
    includeBackground: boolean
  ): Promise<HTMLCanvasElement> {
    const svgString = SvgRenderer.renderToSvg(doc, {
      includeBackground,
      includeReferences: false,
      customWidth: width,
      customHeight: height
    })

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to get 2D canvas context.'))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        if (includeBackground && doc.background && doc.background !== 'transparent') {
          ctx.fillStyle = doc.background
          ctx.fillRect(0, 0, width, height)
        }

        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve(canvas)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to decode rendered SVG for export.'))
      }

      img.src = url
    })
  }

  /**
   * Triggers client-side browser download for a generated Blob.
   */
  public static downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
