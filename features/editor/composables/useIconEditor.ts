/**
 * Professional Icon Editor - Vue 3 Composable Bridge
 * Architecture Layer: State Management & UI Reactive Orchestrator
 */

import { ref, computed, shallowRef, onMounted, onUnmounted } from 'vue'
import { EditorCore } from '../engine/editorCore'
import { CommandHistory } from '../engine/commandHistory'
import {
  AddElementCommand,
  RemoveElementCommand,
  TransformElementCommand,
  UpdateElementPropsCommand,
  ReorderElementCommand,
  BatchCommand
} from '../engine/commands'
import { EditorImportService } from '../services/editorImportService'
import { EditorExportService } from '../services/editorExportService'
import type {
  EditorDocument,
  EditorElement,
  EditorTool,
  CanvasTransform,
  CanvasGridConfig,
  ExportOptions,
  BoundingBox
} from '../types/editor'
import { DEFAULT_GRID_CONFIG } from '../types/editor'

export function useIconEditor() {
  const core = new EditorCore()
  const history = new CommandHistory(50)

  // Reactive state
  const doc = ref<EditorDocument>(core.getDocument())
  const selectedIds = ref<string[]>([])
  const activeTool = ref<EditorTool>('select')
  const canvasTransform = ref<CanvasTransform>({ zoom: 1, panX: 0, panY: 0 })
  const gridConfig = ref<CanvasGridConfig>({ ...DEFAULT_GRID_CONFIG })
  const isExportModalOpen = ref(false)
  const isShortcutsModalOpen = ref(false)
  const isPreviewMode = ref(false)
  const clipboardElement = shallowRef<EditorElement | null>(null)
  const isDirty = ref(false)
  const historyTick = ref(0) // reactive trigger for undo/redo state

  // Sync internal core changes into Vue reactive ref
  core.subscribe((updatedDoc) => {
    doc.value = { ...updatedDoc, elements: [...updatedDoc.elements] }
    selectedIds.value = core.getSelectedIds()
    isDirty.value = true
  })

  history.subscribe(() => {
    historyTick.value++
  })

  // Computed state
  const selectedElements = computed<EditorElement[]>(() => {
    return doc.value.elements.filter(el => selectedIds.value.includes(el.id))
  })

  const primarySelected = computed<EditorElement | null>(() => {
    return selectedElements.value[0] || null
  })

  const selectionBounds = computed<BoundingBox | null>(() => {
    // Read directly from core geometry calculation
    return core.getSelectionBoundingBox()
  })

  const canUndo = computed(() => {
    // depend on historyTick to trigger reactivity
    void historyTick.value
    return history.canUndo
  })

  const canRedo = computed(() => {
    void historyTick.value
    return history.canRedo
  })

  const lastUndoLabel = computed(() => {
    void historyTick.value
    return history.getLastUndoDescription()
  })

  // ==========================================
  // COMMAND EXECUTION WRAPPERS
  // ==========================================

  const execute = (cmd: any) => {
    history.execute(cmd, core)
  }

  const undo = () => {
    history.undo(core)
  }

  const redo = () => {
    history.redo(core)
  }

  // ==========================================
  // ELEMENT CREATION
  // ==========================================

  const addShape = (tool: EditorTool, x?: number, y?: number) => {
    const centerDefaultX = Math.round(doc.value.width / 2)
    const centerDefaultY = Math.round(doc.value.height / 2)
    const posX = x !== undefined ? x : Math.round(centerDefaultX - 32)
    const posY = y !== undefined ? y : Math.round(centerDefaultY - 32)

    let newEl: EditorElement | null = null

    switch (tool) {
      case 'rect':
        newEl = core.createRect(posX, posY, 64, 64)
        break
      case 'circle':
        newEl = core.createCircle(x !== undefined ? x : centerDefaultX, y !== undefined ? y : centerDefaultY, 32)
        break
      case 'ellipse':
        newEl = core.createEllipse(x !== undefined ? x : centerDefaultX, y !== undefined ? y : centerDefaultY, 40, 24)
        break
      case 'line':
        newEl = core.createLine(posX, posY, posX + 60, posY + 40)
        break
      case 'polygon':
        newEl = core.createPolygon(x !== undefined ? x : centerDefaultX, y !== undefined ? y : centerDefaultY, 32, 5)
        break
      case 'text':
        newEl = core.createText('Icon', posX, posY + 24)
        break
      case 'pen':
        // Starter path
        newEl = core.createPath(`M ${posX} ${posY} C ${posX + 20} ${posY - 30}, ${posX + 40} ${posY + 30}, ${posX + 60} ${posY}`, 'Curved Path')
        break
    }

    if (newEl) {
      execute(new AddElementCommand(newEl))
      activeTool.value = 'select'
    }
  }

  // ==========================================
  // SELECTION & MANIPULATION
  // ==========================================

  const selectElement = (id: string, multi = false) => {
    core.select(id, multi)
    selectedIds.value = core.getSelectedIds()
  }

  const clearSelection = () => {
    core.clearSelection()
    selectedIds.value = []
  }

  const selectAll = () => {
    core.selectAll()
    selectedIds.value = core.getSelectedIds()
  }

  const deleteSelected = () => {
    const ids = core.getSelectedIds()
    if (ids.length === 0) return

    if (ids.length === 1) {
      execute(new RemoveElementCommand(ids[0]))
    } else {
      const commands = ids.map(id => new RemoveElementCommand(id))
      execute(new BatchCommand(commands, `Delete ${ids.length} elements`))
    }
  }

  const duplicateSelected = () => {
    const ids = core.getSelectedIds()
    if (ids.length === 0) return

    for (const id of ids) {
      const original = core.getElementById(id)
      if (original) {
        const clone = core.duplicateElement(id)
        if (clone) {
          // Wrap in command for undo capability
          history.execute({
            id: `dup_${clone.id}`,
            description: `Duplicate ${original.name}`,
            execute: () => {}, // already executed in duplicateElement
            undo: (c) => c.removeElement(clone.id)
          }, core)
        }
      }
    }
  }

  const updateSelectedProps = (patch: Record<string, unknown>, label = 'Update property') => {
    const ids = core.getSelectedIds()
    if (ids.length === 0) return

    const commands: any[] = []
    for (const id of ids) {
      const el = core.getElementById(id)
      if (!el) continue

      const beforePatch: Record<string, unknown> = {}
      for (const k of Object.keys(patch)) {
        beforePatch[k] = (el as any)[k]
      }

      commands.push(new UpdateElementPropsCommand(id, beforePatch, patch, label))
    }

    if (commands.length === 1) {
      execute(commands[0])
    } else if (commands.length > 1) {
      execute(new BatchCommand(commands, label))
    }
  }

  const applyTransform = (
    elementId: string,
    beforeState: Record<string, unknown>,
    afterState: Record<string, unknown>
  ) => {
    execute(new TransformElementCommand(elementId, beforeState, afterState))
  }

  // ==========================================
  // LAYER REORDERING & LOCK/VISIBILITY
  // ==========================================

  const reorderLayer = (id: string, action: 'front' | 'back' | 'forward' | 'backward') => {
    const fromIndex = core.getElementIndex(id)
    if (fromIndex === -1) return

    let toIndex = fromIndex
    const total = doc.value.elements.length

    switch (action) {
      case 'front':
        toIndex = total - 1
        break
      case 'back':
        toIndex = 0
        break
      case 'forward':
        toIndex = Math.min(fromIndex + 1, total - 1)
        break
      case 'backward':
        toIndex = Math.max(fromIndex - 1, 0)
        break
    }

    if (toIndex !== fromIndex) {
      execute(new ReorderElementCommand(id, fromIndex, toIndex, `Move layer ${action}`))
    }
  }

  const toggleLayerVisibility = (id: string) => {
    const el = core.getElementById(id)
    if (el) {
      core.updateElement(id, { visible: !el.visible })
    }
  }

  const toggleLayerLock = (id: string) => {
    const el = core.getElementById(id)
    if (el) {
      core.updateElement(id, { locked: !el.locked })
    }
  }

  const renameLayer = (id: string, newName: string) => {
    if (newName.trim()) {
      core.updateElement(id, { name: newName.trim() })
    }
  }

  // ==========================================
  // CLIPBOARD (COPY / PASTE)
  // ==========================================

  const copySelected = () => {
    if (primarySelected.value) {
      clipboardElement.value = JSON.parse(JSON.stringify(primarySelected.value))
    }
  }

  const paste = () => {
    if (!clipboardElement.value) return
    const clone = JSON.parse(JSON.stringify(clipboardElement.value)) as EditorElement
    clone.id = `paste_${Math.random().toString(36).substr(2, 9)}`
    clone.name = `${clipboardElement.value.name} (paste)`

    if ('x' in clone && typeof clone.x === 'number') clone.x += 16
    if ('y' in clone && typeof clone.y === 'number') clone.y += 16
    if ('cx' in clone && typeof clone.cx === 'number') clone.cx += 16
    if ('cy' in clone && typeof clone.cy === 'number') clone.cy += 16

    execute(new AddElementCommand(clone))
  }

  // ==========================================
  // ZOOM & PAN
  // ==========================================

  const zoomIn = () => {
    canvasTransform.value.zoom = Math.min(canvasTransform.value.zoom * 1.25, 16)
  }

  const zoomOut = () => {
    canvasTransform.value.zoom = Math.max(canvasTransform.value.zoom / 1.25, 0.25)
  }

  const resetZoom = () => {
    canvasTransform.value.zoom = 1
    canvasTransform.value.panX = 0
    canvasTransform.value.panY = 0
  }

  const setZoom = (zoomLevel: number) => {
    canvasTransform.value.zoom = Math.min(Math.max(zoomLevel, 0.25), 16)
  }

  // ==========================================
  // DOCUMENT IMPORT / EXPORT
  // ==========================================

  const importSvg = async (svgContent: string) => {
    const res = await EditorImportService.importSvgString(svgContent, core)
    if (res.success) {
      history.clear()
    }
    return res
  }

  const importReferenceImage = async (file: File) => {
    return await EditorImportService.importImageAsReference(file, core)
  }

  const exportDoc = async (options: ExportOptions) => {
    return await EditorExportService.exportDocument(doc.value, options)
  }

  // ==========================================
  // LOCAL STORAGE PERSISTENCE
  // ==========================================

  const STORAGE_KEY = 'icon_editor_project_v1'

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc.value))
      isDirty.value = false
      return true
    } catch {
      return false
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const parsed = JSON.parse(data) as EditorDocument
        if (parsed && Array.isArray(parsed.elements)) {
          core.loadDocument(parsed)
          history.clear()
          isDirty.value = false
          return true
        }
      }
    } catch {
      // ignore corrupted data
    }
    return false
  }

  return {
    core,
    history,
    doc,
    selectedIds,
    selectedElements,
    primarySelected,
    selectionBounds,
    activeTool,
    canvasTransform,
    gridConfig,
    isExportModalOpen,
    isShortcutsModalOpen,
    isPreviewMode,
    isDirty,
    canUndo,
    canRedo,
    lastUndoLabel,
    execute,
    undo,
    redo,
    addShape,
    selectElement,
    clearSelection,
    selectAll,
    deleteSelected,
    duplicateSelected,
    updateSelectedProps,
    applyTransform,
    reorderLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    copySelected,
    paste,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    importSvg,
    importReferenceImage,
    exportDoc,
    saveToLocalStorage,
    loadFromLocalStorage
  }
}
