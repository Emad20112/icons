import ImageTracer, { type ImageTracerOptions } from 'imagetracerjs'
import type {
  VectorizationOptions,
  VectorizationResult,
  VectorizationStats
} from '../types/vectorization'
import {
  cleanAndSanitizeVectorSvg,
  validateTrueVectorSvg
} from '../utils/svgValidator'

export class VectorizationService {
  /**
   * Maximum dimension in pixels for vectorization.
   * Large photos/rasters are intelligently downscaled to protect memory and responsiveness.
   */
  public static readonly MAX_CANVAS_DIMENSION = 1536

  /**
   * Pre-processes pixel data for B&W thresholding, inversion, background removal, and grayscale.
   */
  public static preprocessImageData(
    source: { width: number; height: number; data: Uint8ClampedArray },
    options: VectorizationOptions
  ): { width: number; height: number; data: Uint8ClampedArray } {
    const { width, height, data } = source
    const outputData = new Uint8ClampedArray(data.length)

    const isBW = options.colorMode === 'black_and_white'
    const isGray = options.colorMode === 'grayscale'
    const threshold = options.threshold ?? 128
    const invert = options.invert ?? false
    const removeBg = options.removeBackground ?? false

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      // Transparent pixels remain transparent
      if (a < 10) {
        outputData[i] = 255
        outputData[i + 1] = 255
        outputData[i + 2] = 255
        outputData[i + 3] = 0
        continue
      }

      // Standard ITU-R BT.601 luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      if (isBW) {
        const isFg = invert ? lum >= threshold : lum < threshold
        if (isFg) {
          // Foreground (e.g. icon graphic)
          outputData[i] = 0
          outputData[i + 1] = 0
          outputData[i + 2] = 0
          outputData[i + 3] = 255
        } else {
          // Background
          if (removeBg) {
            outputData[i] = 255
            outputData[i + 1] = 255
            outputData[i + 2] = 255
            outputData[i + 3] = 0
          } else {
            outputData[i] = 255
            outputData[i + 1] = 255
            outputData[i + 2] = 255
            outputData[i + 3] = 255
          }
        }
      } else if (isGray) {
        outputData[i] = lum
        outputData[i + 1] = lum
        outputData[i + 2] = lum
        outputData[i + 3] = a
      } else {
        // Multi-color pass-through
        outputData[i] = r
        outputData[i + 1] = g
        outputData[i + 2] = b
        outputData[i + 3] = a
      }
    }

    return { width, height, data: outputData }
  }

  /**
   * Constructs tracing parameters based on quality, detail, and smoothing levels.
   */
  public static buildTracerOptions(options: VectorizationOptions): ImageTracerOptions {
    const isBW = options.colorMode === 'black_and_white'
    const isGray = options.colorMode === 'grayscale'

    // 1. Speckle omission threshold (in pixels)
    let pathomit = options.speckleFilter ?? 4
    if (options.detail === 'low') pathomit = Math.max(pathomit, 16)
    if (options.detail === 'medium') pathomit = Math.max(pathomit, 8)
    if (options.detail === 'high') pathomit = Math.max(pathomit, 4)
    if (options.detail === 'ultra') pathomit = Math.max(pathomit, 1)

    // 2. Linear and quadratic curve tolerances
    let ltres = 1
    let qtres = 1
    if (options.detail === 'low') {
      ltres = 2.0
      qtres = 2.0
    } else if (options.detail === 'medium') {
      ltres = 1.0
      qtres = 1.0
    } else if (options.detail === 'high') {
      ltres = 0.5
      qtres = 0.5
    } else if (options.detail === 'ultra') {
      ltres = 0.2
      qtres = 0.2
    }

    // 3. Blur smoothing
    let blurradius = 0
    let blurdelta = 20
    if (options.smoothing === 'low') {
      blurradius = 1
      blurdelta = 15
    } else if (options.smoothing === 'medium') {
      blurradius = 2
      blurdelta = 25
    } else if (options.smoothing === 'high') {
      blurradius = 4
      blurdelta = 35
    }

    // 4. Color sampling & number of colors
    let numberofcolors = 8
    if (isBW) {
      numberofcolors = 2
    } else if (isGray) {
      numberofcolors = Math.min(Math.max(options.numberOfColors || 8, 2), 32)
    } else {
      numberofcolors = Math.min(Math.max(options.numberOfColors || 8, 2), 32)
    }

    return {
      corsenabled: false,
      ltres,
      qtres,
      pathomit,
      rightangleenhance: true,
      colorsampling: isBW ? 0 : 2,
      numberofcolors,
      mincolorratio: 0,
      colorquantcycles: isBW ? 1 : 3,
      layering: 0,
      strokewidth: isBW ? 0.5 : 1,
      linefilter: false,
      scale: 1,
      roundcoords: options.roundCoords ?? 1,
      viewbox: true,
      desc: false,
      lcpr: 0,
      qcpr: 0,
      blurradius,
      blurdelta
    }
  }

  /**
   * Traces an ImageData object into a sanitized, validated true vector SVG.
   */
  public static traceImageData(
    imageData: { width: number; height: number; data: Uint8ClampedArray },
    options: VectorizationOptions,
    originalByteSize = 0
  ): VectorizationResult {
    const startTime = performance.now()

    // 1. Preprocess pixel data
    const processed = this.preprocessImageData(imageData, options)

    // 2. Build tracer configuration
    const tracerOpts = this.buildTracerOptions(options)

    // 3. Execute vector path generation
    const rawSvg = ImageTracer.imagedataToSVG(processed, tracerOpts)

    // 4. Sanitize and clean SVG output
    const sanitizedSvg = cleanAndSanitizeVectorSvg(rawSvg, imageData.width, imageData.height)

    // 5. Validate true vector compliance (no raster embeds, valid path structure)
    const validation = validateTrueVectorSvg(sanitizedSvg)
    if (!validation.isTrueVector) {
      const errMessage = validation.errors.join('; ') || 'SVG vectorization produced invalid or non-vector output'
      throw new Error(`Vectorization error: ${errMessage}`)
    }

    const durationMs = Math.round(performance.now() - startTime)
    const svgByteSize = new TextEncoder().encode(sanitizedSvg).length
    const compressionRatio = originalByteSize > 0
      ? Number(((svgByteSize / originalByteSize) * 100).toFixed(1))
      : 100

    const stats: VectorizationStats = {
      pathCount: validation.pathCount,
      nodeCount: validation.nodeCount,
      colorCount: validation.colors.size,
      svgByteSize,
      originalByteSize,
      compressionRatio,
      width: imageData.width,
      height: imageData.height,
      durationMs
    }

    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizedSvg)}`

    return {
      svgString: sanitizedSvg,
      svgDataUrl,
      stats,
      isTrueVector: true
    }
  }

  /**
   * Helper to load an image source into an HTMLImageElement safely.
   */
  public static loadImage(source: string | Blob | File): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
    return new Promise((resolve, reject) => {
      let objectUrl = ''
      let src = ''

      if (typeof source === 'string') {
        src = source
      } else {
        objectUrl = URL.createObjectURL(source)
        src = objectUrl
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = ''
        }
      }

      img.onload = () => resolve({ img, cleanup })
      img.onerror = (e) => {
        cleanup()
        reject(new Error('Failed to load image for vectorization'))
      }
      img.src = src
    })
  }

  /**
   * Extracts ImageData from an image source, automatically downscaling if larger than max dimension.
   */
  public static extractImageData(
    img: HTMLImageElement,
    maxDimension = VectorizationService.MAX_CANVAS_DIMENSION
  ): { width: number; height: number; data: Uint8ClampedArray } {
    let targetW = img.naturalWidth || img.width
    let targetH = img.naturalHeight || img.height

    if (!targetW || !targetH) {
      throw new Error('Invalid image dimensions (0x0)')
    }

    // Downscale proportionally if exceeding maxDimension
    if (targetW > maxDimension || targetH > maxDimension) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH / targetW) * maxDimension)
        targetW = maxDimension
      } else {
        targetW = Math.round((targetW / targetH) * maxDimension)
        targetH = maxDimension
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable')
    }

    ctx.drawImage(img, 0, 0, targetW, targetH)
    const imgData = ctx.getImageData(0, 0, targetW, targetH)

    return {
      width: targetW,
      height: targetH,
      data: imgData.data
    }
  }

  /**
   * Complete client-side vectorization from File, Blob, or Data URI.
   */
  public static async vectorizeImage(
    source: File | Blob | string,
    options: VectorizationOptions
  ): Promise<VectorizationResult> {
    const originalByteSize = source instanceof Blob ? source.size : 0
    const { img, cleanup } = await this.loadImage(source)

    try {
      const imageData = this.extractImageData(img)
      return this.traceImageData(imageData, options, originalByteSize)
    } finally {
      cleanup()
    }
  }
}
