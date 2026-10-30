/**
 * Professional Icon Editor - Core Engine
 * Architecture Layer: Headless Core (Clean Architecture, zero DOM/Vue dependencies)
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
  ImageElement,
  BoundingBox
} from '../types/editor'
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../types/editor'

export class EditorCore {
  private document: EditorDocument
  private selectedIds: Set<string> = new Set()
  private listeners: Set<(doc: EditorDocument) => void> = new Set()

  constructor(initialDoc?: EditorDocument) {
    this.document = initialDoc ? this.cloneDoc(initialDoc) : this.createDefaultDocument()
  }

  // ==========================================
  // DOCUMENT LIFECYCLE
  // ==========================================

  public createDefaultDocument(
    name = 'untitled-icon',
    width = DEFAULT_CANVAS_WIDTH,
    height = DEFAULT_CANVAS_HEIGHT
  ): EditorDocument {
    return {
      id: this.generateId('doc'),
      name,
      width,
      height,
      viewBox: { minX: 0, minY: 0, width, height },
      background: 'transparent',
      elements: [],
      version: 1,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }

  public loadDocument(doc: EditorDocument): void {
    this.document = this.cloneDoc(doc)
    this.selectedIds.clear()
    this.notify()
  }

  public getDocument(): Readonly<EditorDocument> {
    return this.document
  }

  public setDocumentName(name: string): void {
    this.document.name = name.trim() || 'untitled-icon'
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
  }

  public setCanvasDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.document.width = width
    this.document.height = height
    this.document.viewBox.width = width
    this.document.viewBox.height = height
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
  }

  public setCanvasBackground(color: string): void {
    this.document.background = color
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
  }

  // ==========================================
  // ELEMENT MANAGEMENT
  // ==========================================

  public addElement(element: EditorElement, targetIndex?: number): void {
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= this.document.elements.length) {
      this.document.elements.splice(targetIndex, 0, element)
    } else {
      this.document.elements.push(element)
    }
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
  }

  public removeElement(id: string): EditorElement | null {
    const idx = this.document.elements.findIndex(el => el.id === id)
    if (idx === -1) return null

    const [removed] = this.document.elements.splice(idx, 1)
    this.selectedIds.delete(id)
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
    return removed
  }

  public getElementById(id: string): EditorElement | undefined {
    return this.document.elements.find(el => el.id === id)
  }

  public getElementIndex(id: string): number {
    return this.document.elements.findIndex(el => el.id === id)
  }

  public updateElement<T extends EditorElement>(id: string, patch: Partial<T>): void {
    const el = this.document.elements.find(e => e.id === id)
    if (!el) return

    Object.assign(el, patch)
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
  }

  public reorderElement(id: string, targetIndex: number): boolean {
    const currentIndex = this.getElementIndex(id)
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= this.document.elements.length) {
      return false
    }

    const [item] = this.document.elements.splice(currentIndex, 1)
    this.document.elements.splice(targetIndex, 0, item)
    this.document.metadata.updatedAt = new Date().toISOString()
    this.notify()
    return true
  }

  public bringForward(id: string): boolean {
    const idx = this.getElementIndex(id)
    if (idx === -1 || idx >= this.document.elements.length - 1) return false
    return this.reorderElement(id, idx + 1)
  }

  public sendBackward(id: string): boolean {
    const idx = this.getElementIndex(id)
    if (idx <= 0) return false
    return this.reorderElement(id, idx - 1)
  }

  public bringToFront(id: string): boolean {
    const idx = this.getElementIndex(id)
    if (idx === -1 || idx === this.document.elements.length - 1) return false
    return this.reorderElement(id, this.document.elements.length - 1)
  }

  public sendToBack(id: string): boolean {
    const idx = this.getElementIndex(id)
    if (idx <= 0) return false
    return this.reorderElement(id, 0)
  }

  public duplicateElement(id: string, offset = 10): EditorElement | null {
    const original = this.getElementById(id)
    if (!original) return null

    const clone = JSON.parse(JSON.stringify(original)) as EditorElement
    clone.id = this.generateId(original.type)
    clone.name = `${original.name} (copy)`

    // Offset position so duplicate is clearly visible
    if ('x' in clone && typeof clone.x === 'number') clone.x += offset
    if ('y' in clone && typeof clone.y === 'number') clone.y += offset
    if ('cx' in clone && typeof clone.cx === 'number') clone.cx += offset
    if ('cy' in clone && typeof clone.cy === 'number') clone.cy += offset
    if ('x1' in clone && typeof clone.x1 === 'number') {
      clone.x1 += offset
      clone.y1 += offset
      clone.x2 += offset
      clone.y2 += offset
    }

    const idx = this.getElementIndex(id)
    this.addElement(clone, idx + 1)
    this.select(clone.id)
    return clone
  }

  // ==========================================
  // SELECTION MANAGEMENT
  // ==========================================

  public select(id: string, multi = false): void {
    if (!multi) {
      this.selectedIds.clear()
    }
    if (this.getElementById(id)) {
      this.selectedIds.add(id)
    }
    this.notify()
  }

  public deselect(id: string): void {
    this.selectedIds.delete(id)
    this.notify()
  }

  public clearSelection(): void {
    if (this.selectedIds.size > 0) {
      this.selectedIds.clear()
      this.notify()
    }
  }

  public selectAll(): void {
    this.selectedIds.clear()
    for (const el of this.document.elements) {
      if (el.visible && !el.locked) {
        this.selectedIds.add(el.id)
      }
    }
    this.notify()
  }

  public getSelectedIds(): string[] {
    return Array.from(this.selectedIds)
  }

  public getSelectedElements(): EditorElement[] {
    return this.document.elements.filter(el => this.selectedIds.has(el.id))
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id)
  }

  // ==========================================
  // GEOMETRY & BOUNDING BOX
  // ==========================================

  public getElementBoundingBox(el: EditorElement): BoundingBox {
    switch (el.type) {
      case 'rect':
      case 'image':
        return { x: el.x, y: el.y, width: el.width, height: el.height }

      case 'circle':
        return { x: el.cx - el.r, y: el.cy - el.r, width: el.r * 2, height: el.r * 2 }

      case 'ellipse':
        return { x: el.cx - el.rx, y: el.cy - el.ry, width: el.rx * 2, height: el.ry * 2 }

      case 'line': {
        const minX = Math.min(el.x1, el.x2)
        const minY = Math.min(el.y1, el.y2)
        const maxX = Math.max(el.x1, el.x2)
        const maxY = Math.max(el.y1, el.y2)
        return {
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1)
        }
      }

      case 'polygon': {
        if (!el.points || el.points.length === 0) {
          return { x: 0, y: 0, width: 0, height: 0 }
        }
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const pt of el.points) {
          if (pt.x < minX) minX = pt.x
          if (pt.y < minY) minY = pt.y
          if (pt.x > maxX) maxX = pt.x
          if (pt.y > maxY) maxY = pt.y
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      }

      case 'text':
        // Estimated text bounds (real SVG text bounding requires DOM getBBox)
        const estWidth = Math.max(el.text.length * (el.fontSize * 0.6), 10)
        const estHeight = el.fontSize * 1.2
        return { x: el.x, y: el.y - el.fontSize, width: estWidth, height: estHeight }

      case 'path': {
        // Simple bounding box extraction from path commands
        const nums = el.pathData.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number) || []
        if (nums.length >= 2) {
          const xs: number[] = []
          const ys: number[] = []
          for (let i = 0; i < nums.length; i += 2) {
            xs.push(nums[i])
            if (i + 1 < nums.length) ys.push(nums[i + 1])
          }
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minY = Math.min(...ys)
          const maxY = Math.max(...ys)
          return {
            x: isFinite(minX) ? minX : 0,
            y: isFinite(minY) ? minY : 0,
            width: isFinite(maxX - minX) ? Math.max(maxX - minX, 1) : 0,
            height: isFinite(maxY - minY) ? Math.max(maxY - minY, 1) : 0
          }
        }
        return { x: 0, y: 0, width: 24, height: 24 }
      }

      default:
        return { x: 0, y: 0, width: 0, height: 0 }
    }
  }

  public getSelectionBoundingBox(): BoundingBox | null {
    const selected = this.getSelectedElements()
    if (selected.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const el of selected) {
      const b = this.getElementBoundingBox(el)
      if (b.x < minX) minX = b.x
      if (b.y < minY) minY = b.y
      if (b.x + b.width > maxX) maxX = b.x + b.width
      if (b.y + b.height > maxY) maxY = b.y + b.height
    }

    if (!isFinite(minX) || !isFinite(minY)) return null

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  public snapPoint(value: number, gridSize: number, enabled = false): number {
    if (!enabled || gridSize <= 0) return Math.round(value)
    return Math.round(value / gridSize) * gridSize
  }

  // ==========================================
  // ELEMENT FACTORIES
  // ==========================================

  public createRect(x: number, y: number, width = 64, height = 64): RectElement {
    return {
      id: this.generateId('rect'),
      name: `Rectangle ${this.document.elements.length + 1}`,
      type: 'rect',
      x,
      y,
      width,
      height,
      rx: 0,
      ry: 0,
      fill: '#2563eb',
      stroke: '#1e40af',
      strokeWidth: 2,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createCircle(cx: number, cy: number, r = 32): CircleElement {
    return {
      id: this.generateId('circle'),
      name: `Circle ${this.document.elements.length + 1}`,
      type: 'circle',
      cx,
      cy,
      r,
      fill: '#3b82f6',
      stroke: '#1d4ed8',
      strokeWidth: 2,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createEllipse(cx: number, cy: number, rx = 40, ry = 25): EllipseElement {
    return {
      id: this.generateId('ellipse'),
      name: `Ellipse ${this.document.elements.length + 1}`,
      type: 'ellipse',
      cx,
      cy,
      rx,
      ry,
      fill: '#60a5fa',
      stroke: '#2563eb',
      strokeWidth: 2,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createLine(x1: number, y1: number, x2: number, y2: number): LineElement {
    return {
      id: this.generateId('line'),
      name: `Line ${this.document.elements.length + 1}`,
      type: 'line',
      x1,
      y1,
      x2,
      y2,
      stroke: '#0f172a',
      strokeWidth: 3,
      strokeLinecap: 'round',
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createPolygon(cx: number, cy: number, radius = 35, sides = 5): PolygonElement {
    const points: Array<{ x: number; y: number }> = []
    const angleStep = (Math.PI * 2) / sides

    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2
      points.push({
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle))
      })
    }

    return {
      id: this.generateId('polygon'),
      name: `Polygon ${this.document.elements.length + 1}`,
      type: 'polygon',
      points,
      sides,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 2,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createPath(pathData: string, name?: string): PathElement {
    return {
      id: this.generateId('path'),
      name: name || `Path ${this.document.elements.length + 1}`,
      type: 'path',
      pathData,
      fill: '#10b981',
      stroke: '#047857',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createText(text = 'Icon', x = 32, y = 64): TextElement {
    return {
      id: this.generateId('text'),
      name: `Text (${text.slice(0, 10)})`,
      type: 'text',
      text,
      x,
      y,
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'bold',
      textAlign: 'left',
      fill: '#0f172a',
      stroke: 'none',
      strokeWidth: 0,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false
    }
  }

  public createImage(href: string, x = 0, y = 0, width = 128, height = 128, isReference = false): ImageElement {
    return {
      id: this.generateId('img'),
      name: isReference ? 'Reference Guide' : 'Image Layer',
      type: 'image',
      href,
      x,
      y,
      width,
      height,
      opacity: isReference ? 0.35 : 1,
      rotation: 0,
      visible: true,
      locked: isReference,
      isReference
    }
  }

  // ==========================================
  // HELPERS & OBSERVERS
  // ==========================================

  public subscribe(listener: (doc: EditorDocument) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.document)
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`
  }

  private cloneDoc(doc: EditorDocument): EditorDocument {
    return JSON.parse(JSON.stringify(doc))
  }
}
