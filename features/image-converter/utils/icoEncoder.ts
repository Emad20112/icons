/**
 * Encodes multiple PNG images into a single valid Windows ICO (.ico) binary file.
 * Compatible with modern Microsoft Windows, macOS, Linux, and all web browsers (Favicons).
 */
export interface IcoImageFrame {
  width: number
  height: number
  /** Raw PNG image binary bytes */
  pngBytes: Uint8Array
}

/**
 * Generates a valid multi-resolution ICO file buffer from an array of PNG frames.
 */
export function encodeIco(frames: IcoImageFrame[]): Uint8Array {
  if (!frames || frames.length === 0) {
    throw new Error('At least one image frame is required to encode an ICO file.')
  }

  // Filter frames to max 256x256 (ICO standard limit)
  const validFrames = frames.filter(f => f.width <= 256 && f.height <= 256)
  if (validFrames.length === 0) {
    throw new Error('All image frames exceed the maximum ICO dimension (256x256).')
  }

  const imageCount = validFrames.length

  // Calculate header and directory size:
  // ICONDIR: 6 bytes
  // ICONDIRENTRY: 16 bytes per image
  const headerSize = 6 + (16 * imageCount)

  // Calculate total file size and assign offsets
  let currentOffset = headerSize
  const frameOffsets: number[] = []

  let totalDataSize = 0
  for (const frame of validFrames) {
    frameOffsets.push(currentOffset)
    currentOffset += frame.pngBytes.length
    totalDataSize += frame.pngBytes.length
  }

  const totalIcoSize = headerSize + totalDataSize
  const buffer = new Uint8Array(totalIcoSize)
  const view = new DataView(buffer.buffer)

  // 1. ICONDIR Header (6 bytes)
  view.setUint16(0, 0, true) // Reserved, must be 0
  view.setUint16(2, 1, true) // Resource type: 1 = ICO (icon)
  view.setUint16(4, imageCount, true) // Number of images

  // 2. ICONDIRENTRY list (16 bytes each)
  let entryOffset = 6
  for (let i = 0; i < imageCount; i++) {
    const frame = validFrames[i]
    const dataOffset = frameOffsets[i]
    const dataSize = frame.pngBytes.length

    // Width & Height: 1..255 (256 is represented by 0)
    const bWidth = frame.width === 256 ? 0 : (frame.width & 0xFF)
    const bHeight = frame.height === 256 ? 0 : (frame.height & 0xFF)

    buffer[entryOffset + 0] = bWidth
    buffer[entryOffset + 1] = bHeight
    buffer[entryOffset + 2] = 0 // Color count (0 = no palette / truecolor)
    buffer[entryOffset + 3] = 0 // Reserved, must be 0
    view.setUint16(entryOffset + 4, 1, true) // Color planes: 1
    view.setUint16(entryOffset + 6, 32, true) // Bits per pixel: 32 (RGBA)
    view.setUint32(entryOffset + 8, dataSize, true) // Image size in bytes
    view.setUint32(entryOffset + 12, dataOffset, true) // Image data offset

    entryOffset += 16
  }

  // 3. Write image data buffers (PNG payloads)
  for (let i = 0; i < imageCount; i++) {
    const frame = validFrames[i]
    const offset = frameOffsets[i]
    buffer.set(frame.pngBytes, offset)
  }

  return buffer
}

/**
 * Verifies if a given byte array is a valid ICO file.
 */
export function isValidIcoBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 22) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const reserved = view.getUint16(0, true)
  const type = view.getUint16(2, true)
  const count = view.getUint16(4, true)

  return reserved === 0 && type === 1 && count > 0
}
