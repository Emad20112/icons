/**
 * Professional Icon Editor - Document Model & Type System
 * Architecture Layer: Domain Model (Decoupled from UI)
 */

export type ElementType =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'path'
  | 'text'
  | 'image'

export type StrokeLineCap = 'butt' | 'round' | 'square'
export type StrokeLineJoin = 'miter' | 'round' | 'bevel'
export type TextAlign = 'left' | 'center' | 'right'

export interface BaseElement {
  id: string
  name: string
  type: ElementType
  visible: boolean
  locked: boolean
  opacity: number // 0 to 1
  rotation: number // degrees (0 to 360)
}

export interface RectElement extends BaseElement {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  rx: number
  ry: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface CircleElement extends BaseElement {
  type: 'circle'
  cx: number
  cy: number
  r: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface LineElement extends BaseElement {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  strokeWidth: number
  strokeLinecap: StrokeLineCap
}

export interface PolygonElement extends BaseElement {
  type: 'polygon'
  points: Array<{ x: number; y: number }>
  sides: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface PathElement extends BaseElement {
  type: 'path'
  pathData: string
  fill: string
  stroke: string
  strokeWidth: number
  strokeLinecap: StrokeLineCap
  strokeLinejoin: StrokeLineJoin
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: string | number
  textAlign: TextAlign
  fill: string
  stroke: string
  strokeWidth: number
}

export interface ImageElement extends BaseElement {
  type: 'image'
  href: string // sanitized data url or safe blob
  x: number
  y: number
  width: number
  height: number
  isReference: boolean // if true, acts as a background tracing guide
}

export type EditorElement =
  | RectElement
  | CircleElement
  | EllipseElement
  | LineElement
  | PolygonElement
  | PathElement
  | TextElement
  | ImageElement

export interface DocumentViewBox {
  minX: number
  minY: number
  width: number
  height: number
}

export interface EditorDocument {
  id: string
  name: string
  width: number
  height: number
  viewBox: DocumentViewBox
  background: string // 'transparent' or hex color '#ffffff'
  elements: EditorElement[]
  version: 1
  metadata: {
    createdAt: string
    updatedAt: string
    author?: string
    tags?: string[]
  }
}

export type EditorTool =
  | 'select'
  | 'move'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'pen'
  | 'text'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type TransformHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

export interface CanvasTransform {
  zoom: number // 0.25 to 16 (1 = 100%)
  panX: number
  panY: number
}

export interface CanvasGridConfig {
  showGrid: boolean
  gridSize: number // e.g. 8px, 16px, 32px
  snapToGrid: boolean
}

export type ExportFormat = 'SVG' | 'PNG' | 'WebP' | 'ICO'

export interface ExportOptions {
  format: ExportFormat
  width: number
  height: number
  scale: number // 1x, 2x, 4x, 8x
  includeBackground: boolean
  quality: number // 0.1 to 1.0 for WebP/PNG
  fileName: string
}

export const DEFAULT_CANVAS_WIDTH = 256
export const DEFAULT_CANVAS_HEIGHT = 256

export const DEFAULT_GRID_CONFIG: CanvasGridConfig = {
  showGrid: true,
  gridSize: 16,
  snapToGrid: false
}

export const PRESET_CANVAS_SIZES = [
  { label: '16 × 16 (Favicon)', width: 16, height: 16 },
  { label: '24 × 24 (System Icon)', width: 24, height: 24 },
  { label: '32 × 32 (Standard)', width: 32, height: 32 },
  { label: '48 × 48 (Medium)', width: 48, height: 48 },
  { label: '64 × 64 (Dock Icon)', width: 64, height: 64 },
  { label: '128 × 128 (Badge)', width: 128, height: 128 },
  { label: '256 × 256 (High-Res)', width: 256, height: 256 },
  { label: '512 × 512 (App Icon)', width: 512, height: 512 }
]
