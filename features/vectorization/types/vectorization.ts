export type VectorizationColorMode = 'black_and_white' | 'grayscale' | 'multi_color'

export type VectorizationPreset = 'icon' | 'line_art' | 'detailed' | 'custom'

export type VectorizationDetailLevel = 'low' | 'medium' | 'high' | 'ultra'

export type VectorizationSmoothing = 'none' | 'low' | 'medium' | 'high'

export interface VectorizationOptions {
  preset: VectorizationPreset
  colorMode: VectorizationColorMode
  threshold: number // 0 - 255 (used for black_and_white)
  numberOfColors: number // 2 - 32 (used for grayscale and multi_color)
  detail: VectorizationDetailLevel
  smoothing: VectorizationSmoothing
  speckleFilter: number // omit paths smaller than N pixels (0 - 64)
  invert: boolean
  removeBackground: boolean
  roundCoords: number // 1 or 2 decimal precision
}

export interface VectorizationStats {
  pathCount: number
  nodeCount: number
  colorCount: number
  svgByteSize: number
  originalByteSize: number
  compressionRatio: number
  width: number
  height: number
  durationMs: number
}

export interface VectorizationResult {
  svgString: string
  svgDataUrl: string
  stats: VectorizationStats
  isTrueVector: boolean
}

export interface VectorizationValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats?: Partial<VectorizationStats>
}

export const DEFAULT_VECTORIZATION_OPTIONS: VectorizationOptions = {
  preset: 'icon',
  colorMode: 'multi_color',
  threshold: 128,
  numberOfColors: 8,
  detail: 'high',
  smoothing: 'medium',
  speckleFilter: 4,
  invert: false,
  removeBackground: false,
  roundCoords: 1
}

export const PRESET_CONFIGS: Record<Exclude<VectorizationPreset, 'custom'>, Partial<VectorizationOptions>> = {
  icon: {
    colorMode: 'multi_color',
    threshold: 128,
    numberOfColors: 8,
    detail: 'high',
    smoothing: 'medium',
    speckleFilter: 4,
    invert: false,
    removeBackground: false,
    roundCoords: 1
  },
  line_art: {
    colorMode: 'black_and_white',
    threshold: 140,
    numberOfColors: 2,
    detail: 'ultra',
    smoothing: 'low',
    speckleFilter: 2,
    invert: false,
    removeBackground: true,
    roundCoords: 1
  },
  detailed: {
    colorMode: 'multi_color',
    threshold: 128,
    numberOfColors: 16,
    detail: 'ultra',
    smoothing: 'high',
    speckleFilter: 1,
    invert: false,
    removeBackground: false,
    roundCoords: 1
  }
}
