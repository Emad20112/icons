export type InputImageFormat = 'PNG' | 'JPEG' | 'WEBP' | 'SVG'
export type ExportImageFormat = 'PNG' | 'WEBP' | 'ICO'
export type IconShape = 'square' | 'rounded' | 'circle'
export type FitMode = 'contain' | 'cover'
export type CropPreset = '1:1' | '4:3' | '3:4' | 'free'

export const STANDARD_ICON_SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024] as const
export type StandardIconSize = typeof STANDARD_ICON_SIZES[number]

export const ICO_SUPPORTED_SIZES = [16, 24, 32, 48, 64, 96, 128, 256] as const
export type IcoSupportedSize = typeof ICO_SUPPORTED_SIZES[number]

export interface CropArea {
  /** X start coordinate in normalized (0..1) percentage of image width */
  x: number
  /** Y start coordinate in normalized (0..1) percentage of image height */
  y: number
  /** Width in normalized (0..1) percentage of image width */
  width: number
  /** Height in normalized (0..1) percentage of image height */
  height: number
}

export interface ImageMetadata {
  name: string
  sizeBytes: number
  mimeType: string
  width: number
  height: number
  aspectRatio: number
  detectedFormat: InputImageFormat
}

export interface ImageProcessingOptions {
  crop: CropArea
  targetWidth: number
  targetHeight: number
  backgroundColor: string // 'transparent' or hex/rgb
  paddingPercent: number // 0 to 50
  shape: IconShape
  cornerRadiusPercent: number // 0 to 50
  fitMode: FitMode
  format: ExportImageFormat
  quality?: number // 0.1 to 1.0 (for WebP)
}

export interface RenderResult {
  blob: Blob
  dataUrl?: string
  width: number
  height: number
  format: ExportImageFormat
  fileName: string
}

export interface BatchExportItem {
  size: number
  blob: Blob
  fileName: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  format?: InputImageFormat
  mimeType?: string
}
