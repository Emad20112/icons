import { describe, it, expect, beforeEach } from 'vitest'
import { EditorCore } from '../../features/editor/engine/editorCore'
import { CommandHistory } from '../../features/editor/engine/commandHistory'
import {
  AddElementCommand,
  RemoveElementCommand,
  TransformElementCommand,
  UpdateElementPropsCommand,
  ReorderElementCommand,
  BatchCommand
} from '../../features/editor/engine/commands'
import { SvgRenderer } from '../../features/editor/engine/svgRenderer'
import { EditorImportService } from '../../features/editor/services/editorImportService'
import type { RectElement, CircleElement } from '../../features/editor/types/editor'

describe('Phase 5: Professional Icon Editor Engine Suite', () => {
  let core: EditorCore
  let history: CommandHistory

  beforeEach(() => {
    core = new EditorCore()
    history = new CommandHistory(20)
  })

  describe('1. Document Model & Element Lifecycle', () => {
    it('creates a clean default document with standard artboard bounds', () => {
      const doc = core.getDocument()
      expect(doc.id).toBeDefined()
      expect(doc.name).toBe('untitled-icon')
      expect(doc.width).toBe(256)
      expect(doc.height).toBe(256)
      expect(doc.background).toBe('transparent')
      expect(doc.elements).toEqual([])
      expect(doc.version).toBe(1)
    })

    it('creates and adds all supported element types', () => {
      const rect = core.createRect(10, 10, 50, 50)
      const circle = core.createCircle(100, 100, 30)
      const ellipse = core.createEllipse(150, 150, 40, 20)
      const line = core.createLine(0, 0, 100, 100)
      const poly = core.createPolygon(128, 128, 30, 5)
      const path = core.createPath('M 10 10 L 50 50 Z')
      const text = core.createText('Test Icon', 20, 40)

      core.addElement(rect)
      core.addElement(circle)
      core.addElement(ellipse)
      core.addElement(line)
      core.addElement(poly)
      core.addElement(path)
      core.addElement(text)

      expect(core.getDocument().elements.length).toBe(7)
      expect(core.getElementById(rect.id)?.type).toBe('rect')
      expect(core.getElementById(circle.id)?.type).toBe('circle')
      expect(core.getElementById(poly.id)?.type).toBe('polygon')
    })

    it('removes elements cleanly and cleans selection', () => {
      const rect = core.createRect(0, 0)
      core.addElement(rect)
      core.select(rect.id)

      expect(core.isSelected(rect.id)).toBe(true)

      const removed = core.removeElement(rect.id)
      expect(removed?.id).toBe(rect.id)
      expect(core.getDocument().elements.length).toBe(0)
      expect(core.isSelected(rect.id)).toBe(false)
    })

    it('duplicates element with offset and new ID', () => {
      const rect = core.createRect(20, 30, 40, 40)
      core.addElement(rect)

      const duplicate = core.duplicateElement(rect.id, 15) as RectElement
      expect(duplicate).toBeDefined()
      expect(duplicate.id).not.toBe(rect.id)
      expect(duplicate.x).toBe(35)
      expect(duplicate.y).toBe(45)
      expect(core.getDocument().elements.length).toBe(2)
      expect(core.isSelected(duplicate.id)).toBe(true)
    })
  })

  describe('2. Selection & Bounding Box Calculations', () => {
    it('handles single and multi-selection', () => {
      const el1 = core.createRect(0, 0)
      const el2 = core.createCircle(50, 50)
      core.addElement(el1)
      core.addElement(el2)

      core.select(el1.id)
      expect(core.getSelectedIds()).toEqual([el1.id])

      core.select(el2.id, true) // multi-select
      expect(core.getSelectedIds().sort()).toEqual([el1.id, el2.id].sort())

      core.deselect(el1.id)
      expect(core.getSelectedIds()).toEqual([el2.id])

      core.clearSelection()
      expect(core.getSelectedIds()).toEqual([])
    })

    it('calculates accurate bounding boxes for shapes and selection', () => {
      const rect = core.createRect(10, 20, 80, 60)
      core.addElement(rect)
      core.select(rect.id)

      const bbox = core.getSelectionBoundingBox()
      expect(bbox).toEqual({ x: 10, y: 20, width: 80, height: 60 })

      const circle = core.createCircle(150, 150, 25)
      core.addElement(circle)
      core.select(circle.id, true)

      // Compound bounding box encompassing both shapes
      const compoundBbox = core.getSelectionBoundingBox()
      expect(compoundBbox?.x).toBe(10)
      expect(compoundBbox?.y).toBe(20)
      expect(compoundBbox?.width).toBeGreaterThanOrEqual(165)
    })

    it('snaps coordinates to grid accurately', () => {
      expect(core.snapPoint(17, 16, true)).toBe(16)
      expect(core.snapPoint(25, 16, true)).toBe(32)
      expect(core.snapPoint(17, 16, false)).toBe(17)
    })
  })

  describe('3. Layer Reordering & Stack Integrity', () => {
    it('supports Bring Forward, Send Backward, Bring to Front, Send to Back', () => {
      const a = core.createRect(0, 0)
      const b = core.createCircle(10, 10)
      const c = core.createLine(0, 0, 10, 10)

      core.addElement(a) // index 0
      core.addElement(b) // index 1
      core.addElement(c) // index 2

      // Move 'a' to front (index 2)
      core.bringToFront(a.id)
      expect(core.getDocument().elements.map(e => e.id)).toEqual([b.id, c.id, a.id])

      // Move 'a' backward (index 1)
      core.sendBackward(a.id)
      expect(core.getDocument().elements.map(e => e.id)).toEqual([b.id, a.id, c.id])

      // Move 'c' to back (index 0)
      core.sendToBack(c.id)
      expect(core.getDocument().elements.map(e => e.id)).toEqual([c.id, b.id, a.id])
    })
  })

  describe('4. Command Pattern & Undo / Redo History', () => {
    it('executes and undos AddElementCommand', () => {
      const rect = core.createRect(0, 0)
      const cmd = new AddElementCommand(rect)

      history.execute(cmd, core)
      expect(core.getDocument().elements.length).toBe(1)
      expect(history.canUndo).toBe(true)

      history.undo(core)
      expect(core.getDocument().elements.length).toBe(0)
      expect(history.canUndo).toBe(false)
      expect(history.canRedo).toBe(true)

      history.redo(core)
      expect(core.getDocument().elements.length).toBe(1)
    })

    it('accurately executes multi-step sequence: Add -> Move -> Style -> Undo -> Undo -> Redo', () => {
      const rect = core.createRect(10, 10, 50, 50)
      history.execute(new AddElementCommand(rect), core)

      // Move command
      history.execute(new TransformElementCommand(rect.id, { x: 10, y: 10 }, { x: 80, y: 90 }), core)
      expect((core.getElementById(rect.id) as RectElement).x).toBe(80)

      // Style command
      history.execute(new UpdateElementPropsCommand(rect.id, { fill: '#2563eb' }, { fill: '#ef4444' }), core)
      expect((core.getElementById(rect.id) as RectElement).fill).toBe('#ef4444')

      // Undo Style
      history.undo(core)
      expect((core.getElementById(rect.id) as RectElement).fill).toBe('#2563eb')
      expect((core.getElementById(rect.id) as RectElement).x).toBe(80)

      // Undo Move
      history.undo(core)
      expect((core.getElementById(rect.id) as RectElement).x).toBe(10)

      // Redo Move
      history.redo(core)
      expect((core.getElementById(rect.id) as RectElement).x).toBe(80)
    })

    it('clears redo stack when new mutation occurs after undo', () => {
      const rect1 = core.createRect(0, 0)
      const rect2 = core.createRect(50, 50)

      history.execute(new AddElementCommand(rect1), core)
      history.execute(new AddElementCommand(rect2), core)

      history.undo(core)
      expect(history.canRedo).toBe(true)

      // Brand new action
      const circle = core.createCircle(100, 100)
      history.execute(new AddElementCommand(circle), core)

      expect(history.canRedo).toBe(false)
      expect(core.getDocument().elements.length).toBe(2) // rect1 + circle
    })

    it('enforces memory bound on history stack', () => {
      const tinyHistory = new CommandHistory(3)
      for (let i = 0; i < 6; i++) {
        const el = core.createRect(i * 10, i * 10)
        tinyHistory.execute(new AddElementCommand(el), core)
      }

      expect(tinyHistory.undoCount).toBe(3)
    })
  })

  describe('5. Pure SVG Rendering Engine', () => {
    it('renders clean standard SVG string with viewBox and xmlns', () => {
      const rect = core.createRect(10, 10, 60, 60)
      rect.fill = '#2563eb'
      rect.stroke = '#1e40af'
      rect.strokeWidth = 2
      core.addElement(rect)

      const svg = SvgRenderer.renderToSvg(core.getDocument())

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('viewBox="0 0 256 256"')
      expect(svg).toContain('<rect')
      expect(svg).toContain('fill="#2563eb"')
      expect(svg).toContain('stroke="#1e40af"')
      expect(svg).toContain('stroke-width="2"')
    })

    it('escapes text and attributes to prevent XSS injection', () => {
      const maliciousText = '<script>alert(1)</script>'
      const textEl = core.createText(maliciousText, 20, 20)
      core.addElement(textEl)

      const svg = SvgRenderer.renderToSvg(core.getDocument())
      expect(svg).not.toContain('<script>')
      expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    })
  })

  describe('6. SVG Import & Sanitization', () => {
    it('parses valid SVG with shapes into editable EditorElements', async () => {
      const sampleSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <rect x="10" y="10" width="30" height="30" fill="#ff0000" />
          <circle cx="50" cy="50" r="20" fill="#00ff00" />
          <path d="M 0 0 L 10 10" stroke="#0000ff" stroke-width="2" />
        </svg>
      `

      const res = await EditorImportService.importSvgString(sampleSvg, core)
      expect(res.success).toBe(true)
      expect(res.importedCount).toBe(3)
      expect(core.getDocument().elements.length).toBe(3)
      expect(core.getDocument().elements[0].type).toBe('rect')
      expect(core.getDocument().elements[1].type).toBe('circle')
      expect(core.getDocument().elements[2].type).toBe('path')
    })

    it('rejects invalid or empty SVG input gracefully', async () => {
      const res = await EditorImportService.importSvgString('', core)
      expect(res.success).toBe(false)
      expect(res.error).toBeDefined()
    })
  })
})
