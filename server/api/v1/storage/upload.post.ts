import { storageService } from '../../../services/storageService'
import { AssetService } from '../../../services/assetService'
import { getAuthContext } from '../../../utils/supabaseClient'
import { FileUploadSchema } from '../../../../lib/validation/schemas'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody(event)
  const validation = FileUploadSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error.issues[0]?.message || 'Invalid file payload'
    })
  }

  const { asset_id, format, file_name, file_size, mime_type, content } = validation.data

  // Determine path: assets/{type}s/{asset_id}/{format}/{file_name}
  const cleanName = storageService.sanitizeFilename(file_name)
  const filePath = `assets/files/${asset_id}/${format.toLowerCase()}/${cleanName}`

  // Decode buffer or handle raw text
  let fileBuffer: Buffer | string = content
  if (content.startsWith('data:')) {
    const base64Data = content.split(',')[1] || content
    fileBuffer = Buffer.from(base64Data, 'base64')
  }

  try {
    // 1. Upload through Storage Service (handles SVG sanitization)
    const uploadResult = await storageService.uploadFile({
      bucket: 'assets',
      path: filePath,
      file: fileBuffer,
      mimeType: mime_type
    })

    // 2. Attach File record to asset
    const assetFile = await AssetService.attachFile(
      {
        asset_id,
        format,
        file_path: uploadResult.path,
        file_size: uploadResult.size,
        mime_type: uploadResult.mimeType,
        width: format === 'SVG' ? 24 : null,
        height: format === 'SVG' ? 24 : null,
        metadata: { fullUrl: uploadResult.fullUrl }
      },
      auth.userId,
      auth.role
    )

    return {
      success: true,
      data: {
        file: assetFile,
        url: uploadResult.fullUrl
      }
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message
    })
  }
})
