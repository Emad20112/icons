import { ref, shallowRef, watch, onUnmounted } from 'vue'
import {
  type VectorizationOptions,
  type VectorizationResult,
  type VectorizationPreset,
  DEFAULT_VECTORIZATION_OPTIONS,
  PRESET_CONFIGS
} from '../types/vectorization'
import { VectorizationService } from '../services/vectorizationService'
import { validateImageFile } from '../../image-converter/utils/fileValidator'
import { sanitizeFilename } from '../../../lib/sanitizer/filenameSanitizer'

export function useVectorization() {
  const sourceFile = shallowRef<File | null>(null)
  const sourceUrl = ref<string | null>(null)
  const sourceDimensions = ref<{ width: number; height: number }>({ width: 0, height: 0 })
  const options = ref<VectorizationOptions>({ ...DEFAULT_VECTORIZATION_OPTIONS })
  const result = shallowRef<VectorizationResult | null>(null)
  const isProcessing = ref(false)
  const errorMessage = ref<string | null>(null)
  const viewMode = ref<'preview' | 'split' | 'side_by_side' | 'code'>('preview')
  const zoomLevel = ref<number>(100) // 100%, 200%, 400%, 800%
  const splitPosition = ref<number>(50) // percentage 0 - 100 for before/after slider

  // Stale execution token and debounce timer
  let activeJobId = 0
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const cleanupSourceUrl = () => {
    if (sourceUrl.value && sourceUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(sourceUrl.value)
      sourceUrl.value = null
    }
  }

  const setSourceImage = async (file: File) => {
    errorMessage.value = null
    cleanupSourceUrl()

    // 1. Validate file format and size
    const validation = await validateImageFile(file)
    if (!validation.isValid) {
      errorMessage.value = validation.error || 'Invalid file format or signature.'
      return false
    }

    sourceFile.value = file
    const objectUrl = URL.createObjectURL(file)
    sourceUrl.value = objectUrl

    // 2. Read dimensions safely
    try {
      const { img, cleanup } = await VectorizationService.loadImage(objectUrl)
      sourceDimensions.value = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      }
      cleanup()
    } catch (e: any) {
      errorMessage.value = e?.message || 'Failed to decode image dimensions.'
      return false
    }

    // 3. Trigger initial vectorization
    await executeVectorization()
    return true
  }

  const executeVectorization = async () => {
    if (!sourceFile.value && !sourceUrl.value) return

    const currentJob = ++activeJobId
    isProcessing.value = true
    errorMessage.value = null

    try {
      const source = sourceFile.value || sourceUrl.value!
      const vectorResult = await VectorizationService.vectorizeImage(source, options.value)

      // Guard against stale asynchronous completions
      if (currentJob === activeJobId) {
        result.value = vectorResult
        isProcessing.value = false
      }
    } catch (err: any) {
      if (currentJob === activeJobId) {
        errorMessage.value = err?.message || 'Vectorization failed. Please adjust conversion settings.'
        isProcessing.value = false
      }
    }
  }

  const scheduleVectorization = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      executeVectorization()
    }, 250)
  }

  const applyPreset = (preset: VectorizationPreset) => {
    options.value.preset = preset
    if (preset !== 'custom' && PRESET_CONFIGS[preset]) {
      Object.assign(options.value, PRESET_CONFIGS[preset])
    }
    scheduleVectorization()
  }

  const updateOptions = (patch: Partial<VectorizationOptions>) => {
    options.value.preset = 'custom'
    Object.assign(options.value, patch)
    scheduleVectorization()
  }

  const downloadSvg = (customName?: string) => {
    if (!result.value?.svgString) return

    const baseName = customName || sourceFile.value?.name?.replace(/\.[^/.]+$/, '') || 'vectorized-icon'
    const safeName = sanitizeFilename(baseName).replace(/\.[^/.]+$/, '') || 'vectorized-icon'
    const fileName = `${safeName}.svg`

    const blob = new Blob([result.value.svgString], { type: 'image/svg+xml;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(downloadUrl)
  }

  const copySvgCode = async (): Promise<boolean> => {
    if (!result.value?.svgString) return false
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.value.svgString)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const reset = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    activeJobId++
    cleanupSourceUrl()
    sourceFile.value = null
    sourceDimensions.value = { width: 0, height: 0 }
    result.value = null
    errorMessage.value = null
    options.value = { ...DEFAULT_VECTORIZATION_OPTIONS }
    zoomLevel.value = 100
    viewMode.value = 'preview'
  }

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    cleanupSourceUrl()
  })

  return {
    sourceFile,
    sourceUrl,
    sourceDimensions,
    options,
    result,
    isProcessing,
    errorMessage,
    viewMode,
    zoomLevel,
    splitPosition,
    setSourceImage,
    applyPreset,
    updateOptions,
    executeVectorization,
    downloadSvg,
    copySvgCode,
    reset
  }
}
