/**
 * High-performance, zero-dependency PKZIP (.zip) archive builder.
 * Produces 100% valid, portable ZIP archives compatible with macOS, Windows, Linux, and iOS.
 */

export interface ZipFileInput {
  name: string
  data: Uint8Array
}

// Precomputed CRC32 Table
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  CRC_TABLE[i] = c
}

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/**
 * Packs multiple files into a standard, uncompressed (STORED) PKZIP archive.
 */
export function createZipArchive(files: ZipFileInput[]): Uint8Array {
  const encoder = new TextEncoder()
  const localHeaders: Uint8Array[] = []
  const centralHeaders: Uint8Array[] = []
  const localOffsets: number[] = []

  let currentOffset = 0

  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  // 1. Build Local File Entries
  for (const file of files) {
    localOffsets.push(currentOffset)
    const nameBytes = encoder.encode(file.name)
    const crc = computeCrc32(file.data)
    const size = file.data.length

    // Local Header: 30 bytes + name length + data length
    const headerBuffer = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(headerBuffer.buffer)

    view.setUint32(0, 0x04034B50, true) // Local header signature 'PK\x03\x04'
    view.setUint16(4, 20, true)         // Version needed to extract: 2.0
    view.setUint16(6, 0x0800, true)     // General purpose bit flag (UTF-8 filename)
    view.setUint16(8, 0, true)          // Compression method: 0 (Stored)
    view.setUint16(10, dosTime, true)   // Last mod file time
    view.setUint16(12, dosDate, true)   // Last mod file date
    view.setUint32(14, crc, true)       // CRC-32
    view.setUint32(18, size, true)      // Compressed size
    view.setUint32(22, size, true)      // Uncompressed size
    view.setUint16(26, nameBytes.length, true) // Filename length
    view.setUint16(28, 0, true)         // Extra field length

    headerBuffer.set(nameBytes, 30)

    localHeaders.push(headerBuffer)
    currentOffset += headerBuffer.length + size
  }

  // 2. Build Central Directory Records
  const centralDirStartOffset = currentOffset
  let centralDirSize = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const nameBytes = encoder.encode(file.name)
    const crc = computeCrc32(file.data)
    const size = file.data.length
    const offset = localOffsets[i]

    // Central Directory Entry: 46 bytes + name length
    const centralBuffer = new Uint8Array(46 + nameBytes.length)
    const view = new DataView(centralBuffer.buffer)

    view.setUint32(0, 0x02014B50, true) // Central file header signature 'PK\x01\x02'
    view.setUint16(4, 20, true)         // Version made by: 2.0
    view.setUint16(6, 20, true)         // Version needed to extract: 2.0
    view.setUint16(8, 0x0800, true)     // Bit flag: UTF-8
    view.setUint16(10, 0, true)         // Compression: Stored
    view.setUint16(12, dosTime, true)
    view.setUint16(14, dosDate, true)
    view.setUint32(16, crc, true)
    view.setUint32(20, size, true)
    view.setUint32(24, size, true)
    view.setUint16(28, nameBytes.length, true)
    view.setUint16(30, 0, true)         // Extra field length
    view.setUint16(32, 0, true)         // File comment length
    view.setUint16(34, 0, true)         // Disk number start
    view.setUint16(36, 0, true)         // Internal attributes
    view.setUint32(38, 0x81A40000, true)// External attributes (-rw-r--r--)
    view.setUint32(42, offset, true)    // Relative offset of local header

    centralBuffer.set(nameBytes, 46)

    centralHeaders.push(centralBuffer)
    centralDirSize += centralBuffer.length
  }

  // 3. End of Central Directory Record (22 bytes)
  const eocdBuffer = new Uint8Array(22)
  const eocdView = new DataView(eocdBuffer.buffer)

  eocdView.setUint32(0, 0x06054B50, true) // EOCD signature 'PK\x05\x06'
  eocdView.setUint16(4, 0, true)          // Disk number
  eocdView.setUint16(6, 0, true)          // Start disk
  eocdView.setUint16(8, files.length, true)  // Entries on this disk
  eocdView.setUint16(10, files.length, true) // Total entries
  eocdView.setUint32(12, centralDirSize, true)
  eocdView.setUint32(16, centralDirStartOffset, true)
  eocdView.setUint16(20, 0, true)         // Comment length

  // 4. Assemble final byte array
  const totalZipSize = centralDirStartOffset + centralDirSize + 22
  const finalZip = new Uint8Array(totalZipSize)

  let writePos = 0
  for (let i = 0; i < files.length; i++) {
    finalZip.set(localHeaders[i], writePos)
    writePos += localHeaders[i].length
    finalZip.set(files[i].data, writePos)
    writePos += files[i].data.length
  }

  for (let i = 0; i < files.length; i++) {
    finalZip.set(centralHeaders[i], writePos)
    writePos += centralHeaders[i].length
  }

  finalZip.set(eocdBuffer, writePos)

  return finalZip
}
