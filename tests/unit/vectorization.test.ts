import { describe, it, expect } from 'vitest'
import { VectorizationService } from '../../features/vectorization/services/vectorizationService'
import {
  validateTrueVectorSvg,
  cleanAndSanitizeVectorSvg
} from '../../features/vectorization/utils/svgValidator'
import {
  DEFAULT_VECTORIZATION_OPTIONS,
  type VectorizationOptions
} from '../../features/vectorization/types/vectorization'

describe('Phase 4: True Vectorization Service Suite', () => {
  // Helper to create synthetic 8x8 bitmap data
  function createTestImageData(
    pattern: 'checker' | 'solid_black' | 'solid_white' | 'circle' | 'gradient' = 'checker'
  ): { width: number; height: number; data: Uint8ClampedArray } {
    const width = 8
    const height = 8
    const data = new Uint8ClampedArray(width * height * 4)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        let val = 0

        if (pattern === 'checker') {
          val = (x + y) % 2 === 0 ? 0 : 255
        } else if (pattern === 'solid_black') {
          val = 0
        } else if (pattern === 'solid_white') {
          val = 255
        } else if (pattern === 'circle') {
          const dx = x - 3.5
          const dy = y - 3.5
          val = Math.sqrt(dx * dx + dy * dy) < 3 ? 0 : 255
        } else if (pattern === 'gradient') {
          val = Math.round(((y * width + x) / (width * height - 1)) * 255)
        }

        data[idx] = val
        data[idx + 1] = val
        data[idx + 2] = val
        data[idx + 3] = 255
      }
    }

    return { width, height, data }
  }

  describe('1. True Vector vs Raster Validation', () => {
    it('approves SVGs containing real vector <path> elements and valid viewBox', () => {
      const validSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 10 L 90 10 L 90 90 L 10 90 Z" fill="black" />
        </svg>
      `
      const result = validateTrueVectorSvg(validSvg)
      expect(result.isTrueVector).toBe(true)
      expect(result.hasPaths).toBe(true)
      expect(result.hasEmbeddedRaster).toBe(false)
      expect(result.pathCount).toBe(1)
      expect(result.nodeCount).toBeGreaterThan(0)
    })

    it('REJECTS fake SVGs that merely wrap embedded PNG/JPEG base64 data (<image> tag)', () => {
      const fakeSvgWithImageTag = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width="100" height="100" />
        </svg>
      `
      const result = validateTrueVectorSvg(fakeSvgWithImageTag)
      expect(result.isTrueVector).toBe(false)
      expect(result.hasEmbeddedRaster).toBe(true)
      expect(result.errors.some(e => e.includes('embedded raster'))).toBe(true)
    })

    it('rejects empty or corrupt SVGs', () => {
      expect(validateTrueVectorSvg('').isTrueVector).toBe(false)
      expect(validateTrueVectorSvg('not an svg').isTrueVector).toBe(false)
      expect(validateTrueVectorSvg('<svg></svg>').isTrueVector).toBe(false) // No paths
    })
  })

  describe('2. Sanitization & XSS Defense', () => {
    it('strips <script> tags, onload event handlers, and dangerous javascript URIs', () => {
      const maliciousSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
          <script>console.log('xss')</script>
          <a href="javascript:alert(2)"><path d="M0 0 L10 10 Z" fill="red" /></a>
        </svg>
      `
      const cleaned = cleanAndSanitizeVectorSvg(maliciousSvg, 100, 100)
      expect(cleaned).not.toContain('<script>')
      expect(cleaned).not.toContain('onload=')
      expect(cleaned).not.toContain('javascript:')
      expect(cleaned).toContain('<path')
      expect(cleaned).toContain('xmlns="http://www.w3.org/2000/svg"')
    })
  })

  describe('3. Vectorization Pipeline Execution', () => {
    it('successfully traces bitmap data into genuine SVG vector paths', () => {
      const imgData = createTestImageData('circle')
      const options: VectorizationOptions = {
        ...DEFAULT_VECTORIZATION_OPTIONS,
        colorMode: 'black_and_white',
        threshold: 128
      }

      const result = VectorizationService.traceImageData(imgData, options, 256)

      expect(result.isTrueVector).toBe(true)
      expect(result.svgString).toContain('<svg')
      expect(result.svgString).toContain('<path')
      expect(result.svgString).not.toContain('<image')
      expect(result.stats.pathCount).toBeGreaterThan(0)
      expect(result.stats.width).toBe(8)
      expect(result.stats.height).toBe(8)
      expect(result.stats.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('supports Multi-color vectorization with distinct color layers', () => {
      const imgData = createTestImageData('checker')
      const options: VectorizationOptions = {
        ...DEFAULT_VECTORIZATION_OPTIONS,
        colorMode: 'multi_color',
        numberOfColors: 4
      }

      const result = VectorizationService.traceImageData(imgData, options, 256)

      expect(result.isTrueVector).toBe(true)
      expect(result.stats.pathCount).toBeGreaterThan(0)
      expect(result.svgString).toContain('fill=')
    })

    it('honors B&W threshold parameter variations', () => {
      const imgData = createTestImageData('gradient')
      
      const lowThresholdResult = VectorizationService.traceImageData(
        imgData,
        { ...DEFAULT_VECTORIZATION_OPTIONS, colorMode: 'black_and_white', threshold: 10 },
        256
      )
      
      const highThresholdResult = VectorizationService.traceImageData(
        imgData,
        { ...DEFAULT_VECTORIZATION_OPTIONS, colorMode: 'black_and_white', threshold: 250 },
        256
      )

      expect(lowThresholdResult.svgString).not.toEqual(highThresholdResult.svgString)
    })

    it('honors invert and background removal options', () => {
      const imgData = createTestImageData('circle')
      const inverted = VectorizationService.preprocessImageData(imgData, {
        ...DEFAULT_VECTORIZATION_OPTIONS,
        colorMode: 'black_and_white',
        invert: true,
        removeBackground: true
      })

      expect(inverted.data.length).toBe(imgData.data.length)
      // Check that background pixels received alpha = 0
      let hasTransparentPixel = false
      for (let i = 0; i < inverted.data.length; i += 4) {
        if (inverted.data[i + 3] === 0) {
          hasTransparentPixel = true
          break
        }
      }
      expect(hasTransparentPixel).toBe(true)
    })

    it('supports Grayscale vectorization mode', () => {
      const imgData = createTestImageData('gradient')
      const options: VectorizationOptions = {
        ...DEFAULT_VECTORIZATION_OPTIONS,
        colorMode: 'grayscale',
        numberOfColors: 4
      }

      const result = VectorizationService.traceImageData(imgData, options, 256)
      expect(result.isTrueVector).toBe(true)
      expect(result.stats.pathCount).toBeGreaterThan(0)
    })

    it('builds tracer options matching detail and smoothing levels', () => {
      const lowOpts = VectorizationService.buildTracerOptions({
        ...DEFAULT_VECTORIZATION_OPTIONS,
        detail: 'low',
        smoothing: 'none'
      })
      const ultraOpts = VectorizationService.buildTracerOptions({
        ...DEFAULT_VECTORIZATION_OPTIONS,
        detail: 'ultra',
        smoothing: 'high'
      })

      expect(lowOpts.pathomit).toBeGreaterThan(ultraOpts.pathomit!)
      expect(lowOpts.blurradius).toBe(0)
      expect(ultraOpts.blurradius).toBeGreaterThan(0)
    })

    it('enforces safety limit on maximum canvas dimension', () => {
      expect(VectorizationService.MAX_CANVAS_DIMENSION).toBe(1536)
    })
  })
})

