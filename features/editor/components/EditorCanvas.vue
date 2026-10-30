<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type {
  EditorDocument,
  EditorElement,
  EditorTool,
  CanvasTransform,
  CanvasGridConfig,
  BoundingBox,
  TransformHandle
} from '../types/editor'

const props = defineProps<{
  doc: EditorDocument
  selectedIds: string[]
  activeTool: EditorTool
  canvasTransform: CanvasTransform
  gridConfig: CanvasGridConfig
  selectionBounds: BoundingBox | null
  isPreviewMode: boolean
}>()

const emit = defineEmits<{
  (e: 'select-element', id: string, multi: boolean): void
  (e: 'clear-selection'): void
  (e: 'add-shape-at', tool: EditorTool, x: number, y: number): void
  (e: 'transform-change', elementId: string, beforeState: any, afterState: any): void
  (e: 'update:canvasTransform', transform: CanvasTransform): void
}>()

const viewportRef = ref<HTMLDivElement | null>(null)
const svgCanvasRef = ref<SVGSVGElement | null>(null)

// Interaction state
const isDraggingElement = ref(false)
const isResizing = ref(false)
const isRotating = ref(false)
const isPanning = ref(false)
const activeHandle = ref<TransformHandle | null>(null)

let dragStartMouseX = 0
let dragStartMouseY = 0
let panStartMouseX = 0
let panStartMouseY = 0
let initialTransformState: Record<string, any> = {}

// Computed helper for single active selected element
const activeSelectedElement = computed<EditorElement | null>(() => {
  if (props.selectedIds.length !== 1) return null
  return props.doc.elements.find(el => el.id === props.selectedIds[0]) || null
})

// Bounding box for selection overlay
const bounds = computed<BoundingBox | null>(() => props.selectionBounds)

// Handle locations relative to bounds
const handles = computed<Array<{ type: TransformHandle; x: number; y: number; cursor: string }>>(() => {
  if (!bounds.value) return []
  const { x, y, width, height } = bounds.value

  return [
    { type: 'nw', x, y, cursor: 'nwse-resize' },
    { type: 'n', x: x + width / 2, y, cursor: 'ns-resize' },
    { type: 'ne', x: x + width, y, cursor: 'nesw-resize' },
    { type: 'e', x: x + width, y: y + height / 2, cursor: 'ew-resize' },
    { type: 'se', x: x + width, y: y + height, cursor: 'nwse-resize' },
    { type: 's', x: x + width / 2, y: y + height, cursor: 'ns-resize' },
    { type: 'sw', x, y: y + height, cursor: 'nesw-resize' },
    { type: 'w', x, y: y + height / 2, cursor: 'ew-resize' },
    { type: 'rotate', x: x + width / 2, y: y - 24, cursor: 'grab' }
  ]
})

// Snap coordinate utility
const snap = (val: number): number => {
  if (!props.gridConfig.snapToGrid || props.gridConfig.gridSize <= 0) return Math.round(val)
  return Math.round(val / props.gridConfig.gridSize) * props.gridConfig.gridSize
}

// Convert client mouse event coordinates to SVG canvas viewBox space
const clientToCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } => {
  if (!svgCanvasRef.value) return { x: 0, y: 0 }
  const ctm = svgCanvasRef.value.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const inverse = ctm.inverse()
  const pt = svgCanvasRef.value.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const transformed = pt.matrixTransform(inverse)
  return { x: transformed.x, y: transformed.y }
}

// ==========================================
// MOUSE & POINTER HANDLERS
// ==========================================

// Space key listener for pan mode
const isSpacePressed = ref(false)

const onCanvasKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
    isSpacePressed.value = true
  }
}

const onCanvasKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onCanvasKeyDown)
  window.addEventListener('keyup', onCanvasKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onCanvasKeyDown)
  window.removeEventListener('keyup', onCanvasKeyUp)
})

const handleCanvasMouseDown = (e: MouseEvent) => {
  // If clicking on empty canvas or middle click / space key -> Start Panning
  if (e.button === 1 || isSpacePressed.value || props.activeTool === 'move') {
    isPanning.value = true
    panStartMouseX = e.clientX - props.canvasTransform.panX
    panStartMouseY = e.clientY - props.canvasTransform.panY
    e.preventDefault()
    return
  }

  // If a shape tool is active, create shape at click position
  if (props.activeTool !== 'select') {
    const coords = clientToCanvasCoords(e.clientX, e.clientY)
    const snappedX = snap(coords.x)
    const snappedY = snap(coords.y)
    emit('add-shape-at', props.activeTool, snappedX, snappedY)
    return
  }

  // If clicking outside elements in select mode, clear selection
  if ((e.target as Element).id === 'canvas-bg-layer' || (e.target as Element).tagName === 'svg') {
    emit('clear-selection')
  }
}

const handleElementPointerDown = (el: EditorElement, e: MouseEvent) => {
  if (props.isPreviewMode || el.locked || props.activeTool === 'move') return
  e.stopPropagation()

  const isMulti = e.shiftKey || e.metaKey || e.ctrlKey
  emit('select-element', el.id, isMulti)

  // Record initial state for moving
  isDraggingElement.value = true
  const coords = clientToCanvasCoords(e.clientX, e.clientY)
  dragStartMouseX = coords.x
  dragStartMouseY = coords.y

  initialTransformState = JSON.parse(JSON.stringify(el))
}

const handleHandlePointerDown = (handleType: TransformHandle, e: MouseEvent) => {
  e.stopPropagation()
  if (!activeSelectedElement.value) return

  activeHandle.value = handleType
  initialTransformState = JSON.parse(JSON.stringify(activeSelectedElement.value))

  const coords = clientToCanvasCoords(e.clientX, e.clientY)
  dragStartMouseX = coords.x
  dragStartMouseY = coords.y

  if (handleType === 'rotate') {
    isRotating.value = true
  } else {
    isResizing.value = true
  }
}

const handleGlobalMouseMove = (e: MouseEvent) => {
  // 1. PANNING
  if (isPanning.value) {
    const newPanX = e.clientX - panStartMouseX
    const newPanY = e.clientY - panStartMouseY
    emit('update:canvasTransform', {
      ...props.canvasTransform,
      panX: newPanX,
      panY: newPanY
    })
    return
  }

  const coords = clientToCanvasCoords(e.clientX, e.clientY)
  const dx = coords.x - dragStartMouseX
  const dy = coords.y - dragStartMouseY

  // 2. DRAGGING / MOVING ELEMENT
  if (isDraggingElement.value && activeSelectedElement.value) {
    const el = activeSelectedElement.value

    if ('x' in el && typeof el.x === 'number') {
      el.x = snap(initialTransformState.x + dx)
      el.y = snap(initialTransformState.y + dy)
    } else if ('cx' in el && typeof el.cx === 'number') {
      el.cx = snap(initialTransformState.cx + dx)
      el.cy = snap(initialTransformState.cy + dy)
    } else if ('x1' in el && typeof el.x1 === 'number') {
      el.x1 = snap(initialTransformState.x1 + dx)
      el.y1 = snap(initialTransformState.y1 + dy)
      el.x2 = snap(initialTransformState.x2 + dx)
      el.y2 = snap(initialTransformState.y2 + dy)
    }
    return
  }

  // 3. RESIZING VIA 8 HANDLES
  if (isResizing.value && activeSelectedElement.value && activeHandle.value) {
    const el = activeSelectedElement.value
    const h = activeHandle.value

    if (el.type === 'rect' || el.type === 'image') {
      let { x, y, width, height } = initialTransformState

      if (h.includes('e')) width = Math.max(10, snap(initialTransformState.width + dx))
      if (h.includes('s')) height = Math.max(10, snap(initialTransformState.height + dy))
      if (h.includes('w')) {
        const newW = Math.max(10, snap(initialTransformState.width - dx))
        x = initialTransformState.x + (initialTransformState.width - newW)
        width = newW
      }
      if (h.includes('n')) {
        const newH = Math.max(10, snap(initialTransformState.height - dy))
        y = initialTransformState.y + (initialTransformState.height - newH)
        height = newH
      }

      el.x = x
      el.y = y
      el.width = width
      el.height = height
    } else if (el.type === 'circle') {
      const radiusDelta = Math.max(dx, dy)
      el.r = Math.max(5, snap(initialTransformState.r + radiusDelta))
    } else if (el.type === 'ellipse') {
      if (h.includes('e') || h.includes('w')) {
        el.rx = Math.max(5, snap(initialTransformState.rx + Math.abs(dx)))
      }
      if (h.includes('n') || h.includes('s')) {
        el.ry = Math.max(5, snap(initialTransformState.ry + Math.abs(dy)))
      }
    }
    return
  }

  // 4. ROTATING
  if (isRotating.value && activeSelectedElement.value && bounds.value) {
    const centerX = bounds.value.x + bounds.value.width / 2
    const centerY = bounds.value.y + bounds.value.height / 2
    const rad = Math.atan2(coords.y - centerY, coords.x - centerX)
    let deg = Math.round((rad * 180) / Math.PI) + 90
    if (deg < 0) deg += 360
    if (deg >= 360) deg -= 360

    // Snap to 15 degrees if shift key is pressed
    if (e.shiftKey) {
      deg = Math.round(deg / 15) * 15
    }

    activeSelectedElement.value.rotation = deg
  }
}

const handleGlobalMouseUp = () => {
  if (isDraggingElement.value || isResizing.value || isRotating.value) {
    if (activeSelectedElement.value && Object.keys(initialTransformState).length > 0) {
      const currentState = JSON.parse(JSON.stringify(activeSelectedElement.value))
      emit(
        'transform-change',
        activeSelectedElement.value.id,
        initialTransformState,
        currentState
      )
    }
  }

  isDraggingElement.value = false
  isResizing.value = false
  isRotating.value = false
  isPanning.value = false
  activeHandle.value = null
  initialTransformState = {}
}

// Mouse wheel zoom
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
  const newZoom = Math.min(Math.max(props.canvasTransform.zoom * zoomFactor, 0.25), 16)

  emit('update:canvasTransform', {
    ...props.canvasTransform,
    zoom: newZoom
  })
}

onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMouseMove)
  window.addEventListener('mouseup', handleGlobalMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
})
</script>

<template>
  <div
    ref="viewportRef"
    class="relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden select-none bg-slate-900 border border-slate-800 rounded-2xl cursor-crosshair"
    :class="[
      isPanning || activeTool === 'move' ? 'cursor-grab active:cursor-grabbing' : '',
      activeTool === 'select' ? 'cursor-default' : ''
    ]"
    @mousedown="handleCanvasMouseDown"
    @wheel="handleWheel"
  >
    <!-- Background Grid & Checkerboard Container -->
    <div
      class="transition-transform duration-75 origin-center will-change-transform shadow-2xl rounded-lg"
      :style="{
        transform: `translate(${canvasTransform.panX}px, ${canvasTransform.panY}px) scale(${canvasTransform.zoom})`
      }"
    >
      <!-- Canvas Frame -->
      <div
        class="relative border border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-950 shadow-inner"
        :style="{
          width: `${doc.width}px`,
          height: `${doc.height}px`
        }"
      >
        <!-- Checkerboard transparency pattern -->
        <div class="absolute inset-0 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] dark:bg-[linear-gradient(45deg,#090d16_25%,transparent_25%),linear-gradient(-45deg,#090d16_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#090d16_75%),linear-gradient(-45deg,transparent_75%,#090d16_75%)] bg-[size:16px_16px] pointer-events-none opacity-60"></div>

        <!-- Custom Background Fill -->
        <div
          v-if="doc.background && doc.background !== 'transparent'"
          class="absolute inset-0 pointer-events-none"
          :style="{ backgroundColor: doc.background }"
        ></div>

        <!-- Main SVG Canvas Layer -->
        <svg
          id="canvas-bg-layer"
          ref="svgCanvasRef"
          class="absolute inset-0 w-full h-full overflow-visible"
          :viewBox="`${doc.viewBox.minX} ${doc.viewBox.minY} ${doc.viewBox.width} ${doc.viewBox.height}`"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Grid Overlay Pattern -->
          <defs v-if="gridConfig.showGrid">
            <pattern
              id="editor-grid"
              :width="gridConfig.gridSize"
              :height="gridConfig.gridSize"
              patternUnits="userSpaceOnUse"
            >
              <path
                :d="`M ${gridConfig.gridSize} 0 L 0 0 0 ${gridConfig.gridSize}`"
                fill="none"
                stroke="rgba(100, 116, 139, 0.2)"
                stroke-width="0.75"
              />
            </pattern>
          </defs>

          <rect
            v-if="gridConfig.showGrid"
            width="100%"
            height="100%"
            fill="url(#editor-grid)"
            class="pointer-events-none"
          />

          <!-- Render Elements in Layer Order -->
          <g v-for="el in doc.elements" :key="el.id">
            <template v-if="el.visible">
              <!-- Rect -->
              <rect
                v-if="el.type === 'rect'"
                :x="el.x"
                :y="el.y"
                :width="el.width"
                :height="el.height"
                :rx="el.rx"
                :ry="el.ry"
                :fill="el.fill"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :opacity="el.opacity"
                :transform="el.rotation ? `rotate(${el.rotation}, ${el.x + el.width/2}, ${el.y + el.height/2})` : undefined"
                class="transition-opacity cursor-pointer hover:stroke-blue-400"
                @mousedown="handleElementPointerDown(el, $event)"
              />

              <!-- Circle -->
              <circle
                v-else-if="el.type === 'circle'"
                :cx="el.cx"
                :cy="el.cy"
                :r="el.r"
                :fill="el.fill"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :opacity="el.opacity"
                :transform="el.rotation ? `rotate(${el.rotation}, ${el.cx}, ${el.cy})` : undefined"
                class="transition-opacity cursor-pointer hover:stroke-blue-400"
                @mousedown="handleElementPointerDown(el, $event)"
              />

              <!-- Ellipse -->
              <ellipse
                v-else-if="el.type === 'ellipse'"
                :cx="el.cx"
                :cy="el.cy"
                :rx="el.rx"
                :ry="el.ry"
                :fill="el.fill"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :opacity="el.opacity"
                :transform="el.rotation ? `rotate(${el.rotation}, ${el.cx}, ${el.cy})` : undefined"
                class="transition-opacity cursor-pointer hover:stroke-blue-400"
                @mousedown="handleElementPointerDown(el, $event)"
              />

              <!-- Line -->
              <line
                v-else-if="el.type === 'line'"
                :x1="el.x1"
                :y1="el.y1"
                :x2="el.x2"
                :y2="el.y2"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :stroke-linecap="el.strokeLinecap"
                :opacity="el.opacity"
                class="transition-opacity cursor-pointer hover:stroke-blue-400"
                @mousedown="handleElementPointerDown(el, $event)"
              />

              <!-- Polygon -->
              <polygon
                v-else-if="el.type === 'polygon'"
                :points="el.points.map(p => `${p.x},${p.y}`).join(' ')"
                :fill="el.fill"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :opacity="el.opacity"
                class="transition-opacity cursor-pointer hover:stroke-blue-400"
                @mousedown="handleElementPointerDown(el, $event)"
              />

              <!-- Path -->
              <path
                v-else-if="el.type === 'path'"
                :d="el.pathData"
                :fill="el.fill"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :stroke-linecap="el.strokeLinecap"
                :stroke-linejoin="el.strokeLinejoin"
                :opacity="el.opacity"
                class="transition-opacity cursor-pointer hover:stroke-blue-400"
                @mousedown="handleElementPointerDown(el, $event)"
              />

              <!-- Text -->
              <text
                v-else-if="el.type === 'text'"
                :x="el.x"
                :y="el.y"
                :font-size="el.fontSize"
                :font-family="el.fontFamily"
                :font-weight="el.fontWeight"
                :text-anchor="el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start'"
                :fill="el.fill"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                :opacity="el.opacity"
                class="transition-opacity cursor-pointer hover:stroke-blue-400 select-none"
                @mousedown="handleElementPointerDown(el, $event)"
              >
                {{ el.text }}
              </text>

              <!-- Image Reference -->
              <image
                v-else-if="el.type === 'image'"
                :href="el.href"
                :x="el.x"
                :y="el.y"
                :width="el.width"
                :height="el.height"
                :opacity="el.opacity"
                preserveAspectRatio="xMidYMid meet"
                class="transition-opacity cursor-pointer"
                @mousedown="handleElementPointerDown(el, $event)"
              />
            </template>
          </g>

          <!-- Selection & Transform Bounding Box Overlay -->
          <g v-if="!isPreviewMode && bounds" class="pointer-events-auto">
            <!-- Outer selection rectangle -->
            <rect
              :x="bounds.x - 1"
              :y="bounds.y - 1"
              :width="bounds.width + 2"
              :height="bounds.height + 2"
              fill="none"
              stroke="#3b82f6"
              stroke-width="1.5"
              stroke-dasharray="4 2"
              class="pointer-events-none"
            />

            <!-- Stem line to rotation handle -->
            <line
              :x1="bounds.x + bounds.width / 2"
              :y1="bounds.y"
              :x2="bounds.x + bounds.width / 2"
              :y2="bounds.y - 20"
              stroke="#3b82f6"
              stroke-width="1.5"
              class="pointer-events-none"
            />

            <!-- 8 Transform & 1 Rotation Handles -->
            <circle
              v-for="h in handles"
              :key="h.type"
              :cx="h.x"
              :cy="h.y"
              :r="h.type === 'rotate' ? 5 : 4"
              :fill="h.type === 'rotate' ? '#3b82f6' : '#ffffff'"
              stroke="#3b82f6"
              stroke-width="1.5"
              class="hover:scale-125 transition-transform"
              :style="{ cursor: h.cursor }"
              @mousedown="handleHandlePointerDown(h.type, $event)"
            />
          </g>
        </svg>
      </div>
    </div>

    <!-- Canvas Dimensions Overlay Label -->
    <div class="absolute bottom-3 start-3 px-2.5 py-1 rounded-md bg-slate-800/80 backdrop-blur-xs border border-slate-700 text-[11px] font-mono text-slate-300 pointer-events-none">
      {{ doc.width }} × {{ doc.height }} px • {{ Math.round(canvasTransform.zoom * 100) }}%
    </div>
  </div>
</template>
