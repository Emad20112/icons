import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import type {
  CropArea,
  CropPreset,
  ExportImageFormat,
  FitMode,
  IconShape,
  ImageMetadata,
  ImageProcessingOptions,
  StandardIconSize
} from '../types/converter'
import { validateImageFile, validateImageDimensions } from '../utils/fileValidator'
import { ImageConverterService } from '../services/imageConverterService'

export function useImageConverter() {
  const file = ref<File | null>(null)
  const fileName = ref<string>('icon')
  const sourceUrl = ref<string | null>(null)
  const sourceImage = ref<HTMLImageElement | null>(null)
  const metadata = ref<ImageMetadata | null>(null)

  // Options
  const crop = ref<CropArea>({ x: 0, y: 0, width: 1, height: 1 })
  const cropPreset = ref<CropPreset>('1:1')
  const shape = ref<IconShape>('square')
  const cornerRadiusPercent = ref<number>(20)
  const backgroundColor = ref<string>('transparent')
  const paddingPercent = ref<number>(0)
  const fitMode = ref<FitMode>('contain')
  const exportFormat = ref<ExportImageFormat>('PNG')
  const currentSize = ref<number>(256)
  const selectedSizes = ref<number[]>([16, 24, 32, 48, 64, 128, 256, 512])

  // States
  const isLoading = ref<boolean>(false)
  const isExporting = ref<boolean>(false)
  const exportProgress = ref<string>('')
  const error = ref<string | null>(null)
  const previewDataUrl = ref<string | null>(null)

  let previewDebounceTimer: any = null

  /**
   * Resets all tool parameters to standard default icon settings.
   */
  function resetToDefaults() {
    shape.value = 'square'
    cornerRadiusPercent.value = 20
    backgroundColor.value = 'transparent'
    paddingPercent.value = 0
    fitMode.value = 'contain'
    exportFormat.value = 'PNG'
    currentSize.value = 256
    selectedSizes.value = [16, 24, 32, 48, 64, 128, 256, 512]
    error.value = null

    if (sourceImage.value) {
      applyDefaultCropForPreset('1:1')
      generateLivePreview()
    }
  }

  /**
   * Cleans up allocated object URLs and frees image memory.
   */
  function clearImage() {
    if (sourceUrl.value) {
      URL.revokeObjectURL(sourceUrl.value)
      sourceUrl.value = null
    }
    sourceImage.value = null
    file.value = null
    metadata.value = null
    previewDataUrl.value = null
    error.value = null
  }

  /**
   * Calculates a centered crop box for a given preset.
   */
  function applyDefaultCropForPreset(preset: CropPreset) {
    cropPreset.value = preset
    if (!sourceImage.value) {
      crop.value = { x: 0, y: 0, width: 1, height: 1 }
      return
    }

    const imgW = sourceImage.value.naturalWidth
    const imgH = sourceImage.value.naturalHeight

    if (preset === 'free') {
      crop.value = { x: 0, y: 0, width: 1, height: 1 }
      return
    }

    let targetRatio = 1 // 1:1
    if (preset === '4:3') targetRatio = 4 / 3
    if (preset === '3:4') targetRatio = 3 / 4

    const imgRatio = imgW / imgH

    if (imgRatio > targetRatio) {
      // Image is wider than target ratio
      const widthFraction = targetRatio / imgRatio
      crop.value = {
        x: (1 - widthFraction) / 2,
        y: 0,
        width: widthFraction,
        height: 1
      }
    } else {
      // Image is taller than target ratio
      const heightFraction = imgRatio / targetRatio
      crop.value = {
        x: 0,
        y: (1 - heightFraction) / 2,
        width: 1,
        height: heightFraction
      }
    }
  }

  /**
   * Uploads, validates, and initializes an image file.
   */
  async function loadFile(selectedFile: File) {
    clearImage()
    isLoading.value = true
    error.value = null

    try {
      // 1. Signature & security validation
      const validation = await validateImageFile(selectedFile)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid or corrupt image file.')
      }

      file.value = selectedFile
      fileName.value = selectedFile.name.replace(/\.[^/.]+$/, '')

      // 2. Load into DOM Image element safely
      const url = URL.createObjectURL(selectedFile)
      sourceUrl.value = url

      const img = await ImageConverterService.loadImage(url)
      sourceImage.value = img

      // 3. Dimension validation
      const dimCheck = validateImageDimensions(img.naturalWidth, img.naturalHeight)
      if (!dimCheck.isValid) {
        throw new Error(dimCheck.error || 'Image dimensions exceed supported bounds.')
      }

      metadata.value = {
        name: selectedFile.name,
        sizeBytes: selectedFile.size,
        mimeType: validation.mimeType || selectedFile.type,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: +(img.naturalWidth / img.naturalHeight).toFixed(3),
        detectedFormat: validation.format || 'PNG'
      }

      // 4. Default 1:1 Crop
      applyDefaultCropForPreset('1:1')

      // 5. Initial preview
      generateLivePreview()
    } catch (err: any) {
      error.value = err.message || 'Failed to process image file.'
      clearImage()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Generates a fast, reactive live preview on canvas.
   */
  function generateLivePreview() {
    if (!sourceImage.value) {
      previewDataUrl.value = null
      return
    }

    try {
      const options: ImageProcessingOptions = {
        crop: crop.value,
        targetWidth: currentSize.value,
        targetHeight: currentSize.value,
        backgroundColor: backgroundColor.value,
        paddingPercent: paddingPercent.value,
        shape: shape.value,
        cornerRadiusPercent: cornerRadiusPercent.value,
        fitMode: fitMode.value,
        format: exportFormat.value === 'ICO' ? 'PNG' : exportFormat.value,
        quality: 0.95
      }

      const canvas = ImageConverterService.renderToCanvas(sourceImage.value, options)
      previewDataUrl.value = canvas.toDataURL('image/png')
    } catch (err: any) {
      error.value = `Live preview error: ${err.message}`
    }
  }

  /**
   * Schedules a debounced preview update.
   */
  function schedulePreviewUpdate() {
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer)
    previewDebounceTimer = setTimeout(() => {
      generateLivePreview()
    }, 40)
  }

  // Watch reactive options to automatically trigger live preview updates
  watch(
    [
      shape,
      cornerRadiusPercent,
      backgroundColor,
      paddingPercent,
      fitMode,
      currentSize,
      crop
    ],
    () => {
      schedulePreviewUpdate()
    },
    { deep: true }
  )

  /**
   * Downloads a single icon file at current resolution.
   */
  async function downloadSingle(size: number = currentSize.value, format: ExportImageFormat = exportFormat.value) {
    if (!sourceImage.value) return
    isExporting.value = true
    exportProgress.value = `Exporting ${size}x${size} ${format}...`

    try {
      const options: ImageProcessingOptions = {
        crop: crop.value,
        targetWidth: size,
        targetHeight: size,
        backgroundColor: backgroundColor.value,
        paddingPercent: paddingPercent.value,
        shape: shape.value,
        cornerRadiusPercent: cornerRadiusPercent.value,
        fitMode: fitMode.value,
        format,
        quality: 0.95
      }

      const result = await ImageConverterService.renderSingle(
        sourceImage.value,
        fileName.value,
        options
      )

      ImageConverterService.triggerDownload(result.blob, result.fileName)
    } catch (err: any) {
      error.value = `Export failed: ${err.message}`
    } finally {
      isExporting.value = false
      exportProgress.value = ''
    }
  }

  /**
   * Downloads all selected sizes packaged into a clean ZIP archive.
   */
  async function downloadAllAsZip(format: ExportImageFormat = exportFormat.value) {
    if (!sourceImage.value || selectedSizes.value.length === 0) return
    isExporting.value = true
    exportProgress.value = `Generating ${selectedSizes.value.length} icon sizes...`

    try {
      const options: Omit<ImageProcessingOptions, 'targetWidth' | 'targetHeight'> = {
        crop: crop.value,
        backgroundColor: backgroundColor.value,
        paddingPercent: paddingPercent.value,
        shape: shape.value,
        cornerRadiusPercent: cornerRadiusPercent.value,
        fitMode: fitMode.value,
        format,
        quality: 0.95
      }

      const zipResult = await ImageConverterService.exportBatchZip(
        sourceImage.value,
        fileName.value,
        selectedSizes.value,
        options
      )

      ImageConverterService.triggerDownload(zipResult.blob, zipResult.fileName)
    } catch (err: any) {
      error.value = `Batch export failed: ${err.message}`
    } finally {
      isExporting.value = false
      exportProgress.value = ''
    }
  }

  /**
   * Downloads a multi-resolution Windows ICO containing all standard sizes (16 to 256).
   */
  async function downloadMultiResIco() {
    if (!sourceImage.value) return
    isExporting.value = true
    exportProgress.value = 'Building multi-resolution ICO file...'

    try {
      const options: Omit<ImageProcessingOptions, 'targetWidth' | 'targetHeight' | 'format'> = {
        crop: crop.value,
        backgroundColor: backgroundColor.value,
        paddingPercent: paddingPercent.value,
        shape: shape.value,
        cornerRadiusPercent: cornerRadiusPercent.value,
        fitMode: fitMode.value,
        quality: 0.95
      }

      const icoResult = await ImageConverterService.generateMultiResolutionIco(
        sourceImage.value,
        fileName.value,
        [16, 24, 32, 48, 64, 128, 256],
        options
      )

      ImageConverterService.triggerDownload(icoResult.blob, icoResult.fileName)
    } catch (err: any) {
      error.value = `Multi-resolution ICO export failed: ${err.message}`
    } finally {
      isExporting.value = false
      exportProgress.value = ''
    }
  }

  function toggleSizeSelection(size: number) {
    if (selectedSizes.value.includes(size)) {
      if (selectedSizes.value.length > 1) {
        selectedSizes.value = selectedSizes.value.filter(s => s !== size)
      }
    } else {
      selectedSizes.value = [...selectedSizes.value, size].sort((a, b) => a - b)
    }
  }

  function selectAllSizes() {
    selectedSizes.value = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]
  }

  onUnmounted(() => {
    clearImage()
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer)
  })

  return {
    // State
    file,
    fileName,
    sourceUrl,
    sourceImage,
    metadata,
    crop,
    cropPreset,
    shape,
    cornerRadiusPercent,
    backgroundColor,
    paddingPercent,
    fitMode,
    exportFormat,
    currentSize,
    selectedSizes,
    isLoading,
    isExporting,
    exportProgress,
    error,
    previewDataUrl,

    // Methods
    loadFile,
    resetToDefaults,
    clearImage,
    applyDefaultCropForPreset,
    generateLivePreview,
    downloadSingle,
    downloadAllAsZip,
    downloadMultiResIco,
    toggleSizeSelection,
    selectAllSizes
  }
}
