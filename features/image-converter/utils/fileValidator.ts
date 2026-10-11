import type { FileValidationResult, InputImageFormat } from '../types/converter'
import { sanitizeSvg } from '../../../lib/sanitizer/svgSanitizer'

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
export const MAX_IMAGE_DIMENSION = 8192 // 8192px width or height
export const MIN_IMAGE_DIMENSION = 8 // 8px minimum

/**
 * Inspects binary magic numbers to determine true image format regardless of file extension.
 */
export function detectFormatFromBytes(bytes: Uint8Array): InputImageFormat | null {
  if (bytes.length < 4) return null

  // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47
  ) {
    return 'PNG'
  }

  // JPEG Signature: FF D8 FF
  if (
    bytes[0] === 0xFF &&
    bytes[1] === 0xD8 &&
    bytes[2] === 0xFF
  ) {
    return 'JPEG'
  }

  // WebP Signature: RIFF....WEBP
  if (bytes.length >= 12) {
    const isRiff =
      bytes[0] === 0x52 && // 'R'
      bytes[1] === 0x49 && // 'I'
      bytes[2] === 0x46 && // 'F'
      bytes[3] === 0x46    // 'F'
    const isWebp =
      bytes[8] === 0x57 && // 'W'
      bytes[9] === 0x45 && // 'E'
      bytes[10] === 0x42 && // 'B'
      bytes[11] === 0x50    // 'P'

    if (isRiff && isWebp) {
      return 'WEBP'
    }
  }

  // SVG Check: Inspect first 1024 bytes as text
  const headText = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024)).trim()
  if (headText.includes('<svg') || headText.includes('<?xml') && headText.includes('<svg')) {
    return 'SVG'
  }

  return null
}

/**
 * Validates a file's size, signature, and format.
 */
export async function validateImageFile(file: File | Blob, originalFileName?: string): Promise<FileValidationResult> {
  const fileName = (file instanceof File ? file.name : originalFileName) || 'image'

  // 1. Check file size
  if (!file || file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty or corrupted (0 bytes).'
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      isValid: false,
      error: `File size (${sizeMb}MB) exceeds the maximum allowed limit of 20MB.`
    }
  }

  // 2. Read first chunk for magic bytes inspection
  try {
    const buffer = await file.slice(0, 2048).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const detectedFormat = detectFormatFromBytes(bytes)

    if (!detectedFormat) {
      return {
        isValid: false,
        error: `Unsupported file format or corrupt image signature for "${fileName}". Only PNG, JPEG, WebP, and safe SVG are supported.`
      }
    }

    // 3. Special handling and security sanitization for SVG
    if (detectedFormat === 'SVG') {
      const fullText = await file.text()
      try {
        const sanitized = sanitizeSvg(fullText)
        if (!sanitized || sanitized.length === 0) {
          return {
            isValid: false,
            error: 'SVG file contains unsafe scripts or invalid markup.'
          }
        }
      } catch (err: any) {
        return {
          isValid: false,
          error: `SVG validation failed: ${err.message || 'Malformed SVG'}`
        }
      }
    }

    const mimeMap: Record<InputImageFormat, string> = {
      PNG: 'image/png',
      JPEG: 'image/jpeg',
      WEBP: 'image/webp',
      SVG: 'image/svg+xml'
    }

    return {
      isValid: true,
      format: detectedFormat,
      mimeType: mimeMap[detectedFormat]
    }
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to read file: ${err.message || 'Unknown read error'}`
    }
  }
}

/**
 * Validates loaded image dimensions.
 */
export function validateImageDimensions(width: number, height: number): { isValid: boolean; error?: string } {
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      isValid: false,
      error: `Image dimensions (${width}x${height}px) are too small. Minimum dimension is ${MIN_IMAGE_DIMENSION}px.`
    }
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      isValid: false,
      error: `Image dimensions (${width}x${height}px) exceed maximum allowed dimension of ${MAX_IMAGE_DIMENSION}px.`
    }
  }

  return { isValid: true }
}
