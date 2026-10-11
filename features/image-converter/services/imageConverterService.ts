import type {
  CropArea,
  ExportImageFormat,
  ImageProcessingOptions,
  RenderResult,
  BatchExportItem,
  StandardIconSize,
  InputImageFormat
} from '../types/converter'
import { encodeIco } from '../utils/icoEncoder'
import { createZipArchive } from '../utils/zipEncoder'

export class ImageConverterService {
  /**
   * Loads an image from a URL, Blob, or File and returns an HTMLImageElement
   */
  static async loadImage(source: string | Blob | File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      let url = ''
      let isRevocable = false

      if (typeof source === 'string') {
        url = source
      } else {
        url = URL.createObjectURL(source)
        isRevocable = true
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        if (isRevocable) {
          URL.revokeObjectURL(url)
        }
        resolve(img)
      }

      img.onerror = (err) => {
        if (isRevocable) {
          URL.revokeObjectURL(url)
        }
        reject(new Error('Failed to load image element: corrupt image data or invalid URL.'))
      }

      img.src = url
    })
  }

  /**
   * Applies shape clipping to a 2D canvas context.
   */
  static applyShapeClipping(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    shape: 'square' | 'rounded' | 'circle',
    cornerRadiusPercent: number = 20
  ): void {
    ctx.beginPath()

    if (shape === 'circle') {
      const radius = Math.min(width, height) / 2
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
    } else if (shape === 'rounded') {
      const maxRadius = Math.min(width, height) / 2
      const radius = Math.max(2, (maxRadius * Math.min(cornerRadiusPercent, 50)) / 50)

      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(0, 0, width, height, radius)
      } else {
        // Fallback for older browsers
        ctx.moveTo(radius, 0)
        ctx.lineTo(width - radius, 0)
        ctx.quadraticCurveTo(width, 0, width, radius)
        ctx.lineTo(width, height - radius)
        ctx.quadraticCurveTo(width, height, width - radius, height)
        ctx.lineTo(radius, height)
        ctx.quadraticCurveTo(0, height, 0, height - radius)
        ctx.lineTo(0, radius)
        ctx.quadraticCurveTo(0, 0, radius, 0)
      }
      ctx.closePath()
      ctx.clip()
    } else {
      // Square
      ctx.rect(0, 0, width, height)
      ctx.closePath()
      ctx.clip()
    }
  }

  /**
   * Renders a processed icon onto a Canvas based on configuration options.
   */
  static renderToCanvas(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    options: ImageProcessingOptions
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = options.targetWidth
    canvas.height = options.targetHeight

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      throw new Error('Canvas 2D context is not available.')
    }

    // Enable ultra-crisp high quality downsampling
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Clear canvas
    ctx.clearRect(0, 0, options.targetWidth, options.targetHeight)

    ctx.save()

    // 1. Apply shape clipping (so rounded / circle clips both background & image)
    this.applyShapeClipping(
      ctx,
      options.targetWidth,
      options.targetHeight,
      options.shape,
      options.cornerRadiusPercent
    )

    // 2. Render Background Color
    if (options.backgroundColor && options.backgroundColor.toLowerCase() !== 'transparent') {
      ctx.fillStyle = options.backgroundColor
      ctx.fillRect(0, 0, options.targetWidth, options.targetHeight)
    }

    // 3. Calculate Source Crop Coordinates
    const srcW = sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width
    const srcH = sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height

    const crop = options.crop || { x: 0, y: 0, width: 1, height: 1 }
    const sx = Math.max(0, crop.x * srcW)
    const sy = Math.max(0, crop.y * srcH)
    const sWidth = Math.min(srcW - sx, crop.width * srcW)
    const sHeight = Math.min(srcH - sy, crop.height * srcH)

    // 4. Calculate Content Box with Padding
    const paddingPercent = Math.max(0, Math.min(50, options.paddingPercent || 0))
    const padX = (options.targetWidth * paddingPercent) / 100
    const padY = (options.targetHeight * paddingPercent) / 100

    const contentW = options.targetWidth - (padX * 2)
    const contentH = options.targetHeight - (padY * 2)

    // 5. Fit Mode Calculation (Contain vs Cover)
    let destW = contentW
    let destH = contentH
    let destX = padX
    let destY = padY

    if (sWidth > 0 && sHeight > 0) {
      if (options.fitMode === 'cover') {
        const scale = Math.max(contentW / sWidth, contentH / sHeight)
        destW = sWidth * scale
        destH = sHeight * scale
        destX = padX + (contentW - destW) / 2
        destY = padY + (contentH - destH) / 2
      } else {
        // contain (default)
        const scale = Math.min(contentW / sWidth, contentH / sHeight)
        destW = sWidth * scale
        destH = sHeight * scale
        destX = padX + (contentW - destW) / 2
        destY = padY + (contentH - destH) / 2
      }
    }

    // 6. Draw Image
    ctx.drawImage(
      sourceImage,
      sx,
      sy,
      sWidth,
      sHeight,
      destX,
      destY,
      destW,
      destH
    )

    ctx.restore()

    return canvas
  }

  /**
   * Converts a canvas to a Blob in the requested format.
   */
  static async canvasToBlob(
    canvas: HTMLCanvasElement,
    format: 'PNG' | 'WEBP',
    quality: number = 0.92
  ): Promise<Blob> {
    const mime = format === 'WEBP' ? 'image/webp' : 'image/png'
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error(`Failed to convert canvas to ${format} blob.`))
          }
        },
        mime,
        format === 'WEBP' ? quality : undefined
      )
    })
  }

  /**
   * Renders a single image file for download.
   */
  static async renderSingle(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    baseName: string,
    options: ImageProcessingOptions
  ): Promise<RenderResult> {
    const cleanName = baseName.replace(/\.[^/.]+$/, '').toLowerCase()

    if (options.format === 'ICO') {
      // Generate ICO with the chosen target size
      const canvas = this.renderToCanvas(sourceImage, {
        ...options,
        targetWidth: Math.min(256, options.targetWidth),
        targetHeight: Math.min(256, options.targetHeight),
      })

      const pngBlob = await this.canvasToBlob(canvas, 'PNG')
      const pngBuffer = await pngBlob.arrayBuffer()
      const icoBytes = encodeIco([
        {
          width: canvas.width,
          height: canvas.height,
          pngBytes: new Uint8Array(pngBuffer)
        }
      ])

      const icoBlob = new Blob([icoBytes], { type: 'image/x-icon' })
      return {
        blob: icoBlob,
        width: canvas.width,
        height: canvas.height,
        format: 'ICO',
        fileName: `${cleanName}-${canvas.width}x${canvas.height}.ico`
      }
    }

    const canvas = this.renderToCanvas(sourceImage, options)
    const blob = await this.canvasToBlob(
      canvas,
      options.format === 'WEBP' ? 'WEBP' : 'PNG',
      options.quality || 0.92
    )

    const ext = options.format.toLowerCase()
    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      format: options.format,
      fileName: `${cleanName}-${canvas.width}x${canvas.height}.${ext}`
    }
  }

  /**
   * Generates a multi-resolution ICO file containing all supported sizes up to 256x256.
   */
  static async generateMultiResolutionIco(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    baseName: string,
    sizes: number[] = [16, 32, 48, 64, 128, 256],
    options: Omit<ImageProcessingOptions, 'targetWidth' | 'targetHeight' | 'format'>
  ): Promise<RenderResult> {
    const cleanName = baseName.replace(/\.[^/.]+$/, '').toLowerCase()
    const validSizes = sizes.filter(s => s <= 256).sort((a, b) => a - b)

    const frames: { width: number; height: number; pngBytes: Uint8Array }[] = []

    for (const size of validSizes) {
      const canvas = this.renderToCanvas(sourceImage, {
        ...options,
        targetWidth: size,
        targetHeight: size,
        format: 'PNG'
      })
      const pngBlob = await this.canvasToBlob(canvas, 'PNG')
      const buffer = await pngBlob.arrayBuffer()
      frames.push({
        width: size,
        height: size,
        pngBytes: new Uint8Array(buffer)
      })
    }

    const icoBytes = encodeIco(frames)
    const icoBlob = new Blob([icoBytes], { type: 'image/x-icon' })

    return {
      blob: icoBlob,
      width: Math.max(...validSizes),
      height: Math.max(...validSizes),
      format: 'ICO',
      fileName: `${cleanName}-multires.ico`
    }
  }

  /**
   * Generates multiple sizes and compresses them into a single .zip archive.
   */
  static async exportBatchZip(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    baseName: string,
    sizes: number[],
    options: Omit<ImageProcessingOptions, 'targetWidth' | 'targetHeight'>
  ): Promise<{ blob: Blob; fileName: string; count: number }> {
    const cleanName = baseName.replace(/\.[^/.]+$/, '').toLowerCase()
    const filesToZip: { name: string; data: Uint8Array }[] = []

    for (const size of sizes) {
      const canvas = this.renderToCanvas(sourceImage, {
        ...options,
        targetWidth: size,
        targetHeight: size
      })

      if (options.format === 'ICO') {
        const pngBlob = await this.canvasToBlob(canvas, 'PNG')
        const buffer = await pngBlob.arrayBuffer()
        const icoBytes = encodeIco([
          {
            width: Math.min(256, size),
            height: Math.min(256, size),
            pngBytes: new Uint8Array(buffer)
          }
        ])
        filesToZip.push({
          name: `${cleanName}-${size}x${size}.ico`,
          data: icoBytes
        })
      } else {
        const blob = await this.canvasToBlob(
          canvas,
          options.format === 'WEBP' ? 'WEBP' : 'PNG',
          options.quality || 0.92
        )
        const buffer = await blob.arrayBuffer()
        const ext = options.format.toLowerCase()
        filesToZip.push({
          name: `${cleanName}-${size}x${size}.${ext}`,
          data: new Uint8Array(buffer)
        })
      }
    }

    // Add a helpful README.txt inside the zip
    const readmeContent = `Digital Assets Platform - Icon Export Package
===============================================
Original: ${baseName}
Export Format: ${options.format}
Sizes: ${sizes.join(', ')} px
Shape: ${options.shape}
Background: ${options.backgroundColor}
Generated: ${new Date().toISOString()}

Enjoy your high-resolution custom icons!
`
    filesToZip.push({
      name: 'README.txt',
      data: new TextEncoder().encode(readmeContent)
    })

    const zipBytes = createZipArchive(filesToZip)
    const zipBlob = new Blob([zipBytes], { type: 'application/zip' })

    return {
      blob: zipBlob,
      fileName: `${cleanName}-icons-bundle.zip`,
      count: sizes.length
    }
  }

  /**
   * Triggers a browser file download from a Blob.
   */
  static triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }
}
