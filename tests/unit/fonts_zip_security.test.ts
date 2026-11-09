import { describe, it, expect } from 'vitest'
import { FontStorageService } from '../../server/services/fontStorageService'
import { FontZipImportService } from '../../server/services/fontZipImportService'
import JSZip from 'jszip'

describe('Font Storage & Bulk ZIP Import Security', () => {
  describe('FontStorageService.validateFontMagicBytes', () => {
    it('accepts TrueType Font magic header (0x00010000)', () => {
      const ttfHeader = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x80])
      expect(FontStorageService.validateFontMagicBytes(ttfHeader)).toBe('ttf')
    })

    it('accepts OpenType Font magic header (OTTO)', () => {
      const otfHeader = Buffer.from('OTTO\0\x08\0\x80', 'binary')
      expect(FontStorageService.validateFontMagicBytes(otfHeader)).toBe('otf')
    })

    it('accepts WOFF format magic header (wOFF)', () => {
      const woffHeader = Buffer.from('wOFF\0\x01\0\0', 'binary')
      expect(FontStorageService.validateFontMagicBytes(woffHeader)).toBe('woff')
    })

    it('accepts WOFF2 format magic header (wOF2)', () => {
      const woff2Header = Buffer.from('wOF2\0\x01\0\0', 'binary')
      expect(FontStorageService.validateFontMagicBytes(woff2Header)).toBe('woff2')
    })

    it('accepts TrueType Collection header (ttcf)', () => {
      const ttcHeader = Buffer.from('ttcf\0\x01\0\0', 'binary')
      expect(FontStorageService.validateFontMagicBytes(ttcHeader)).toBe('ttc')
    })

    it('rejects executable binaries (Windows MZ header)', () => {
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary')
      expect(() => FontStorageService.validateFontMagicBytes(exeBuffer)).toThrow(/disguised executable/)
    })

    it('rejects Linux ELF binary headers', () => {
      const elfBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00])
      expect(() => FontStorageService.validateFontMagicBytes(elfBuffer)).toThrow(/disguised executable/)
    })

    it('rejects script injection payloads (#!/bin/sh, HTML)', () => {
      const scriptBuffer = Buffer.from('#!/bin/bash\nrm -rf /', 'utf-8')
      expect(() => FontStorageService.validateFontMagicBytes(scriptBuffer)).toThrow(/disguised executable/)

      const htmlBuffer = Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>', 'utf-8')
      expect(() => FontStorageService.validateFontMagicBytes(htmlBuffer)).toThrow(/disguised executable/)
    })
  })

  describe('FontZipImportService', () => {
    it('blocks directory traversal attacks in ZIP entries', () => {
      expect(FontZipImportService.isPathTraversalAttack('../../etc/passwd')).toBe(true)
      expect(FontZipImportService.isPathTraversalAttack('..\\..\\windows\\system32')).toBe(true)
      expect(FontZipImportService.isPathTraversalAttack('/absolute/path/font.ttf')).toBe(true)
      expect(FontZipImportService.isPathTraversalAttack('fonts/cairo/Cairo-Regular.ttf')).toBe(false)
      expect(FontZipImportService.isPathTraversalAttack('Amiri-Bold.otf')).toBe(false)
    })

    it('filters out macOS artifacts and system hidden files', () => {
      expect(FontZipImportService.isSystemOrMetadataArtifact('__MACOSX/._Cairo.ttf')).toBe(true)
      expect(FontZipImportService.isSystemOrMetadataArtifact('.DS_Store')).toBe(true)
      expect(FontZipImportService.isSystemOrMetadataArtifact('fonts/Thumbs.db')).toBe(true)
      expect(FontZipImportService.isSystemOrMetadataArtifact('Cairo-Regular.ttf')).toBe(false)
    })

    it('extracts and processes valid font entries from a clean ZIP', async () => {
      const zip = new JSZip()
      const ttfData = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00])
      zip.file('Cairo-Regular.ttf', ttfData)
      zip.file('README.txt', 'This is a readme file.')
      zip.file('__MACOSX/._Cairo.ttf', Buffer.from('junk'))

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
      const result = await FontZipImportService.extractAndValidateZip(zipBuffer)

      expect(result.totalEntriesFound).toBe(3)
      expect(result.skippedNonFontEntries).toBe(2) // README.txt and __MACOSX
      expect(result.totalFontFiles).toBe(1)
      expect(result.entries[0].fileName).toBe('Cairo-Regular.ttf')
      expect(result.entries[0].format).toBe('ttf')
    })

    it('gracefully accepts a direct TTF file buffer without a zip wrapper', async () => {
      const directTtf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00])
      const result = await FontZipImportService.extractAndValidateZip(directTtf, 'Amiri-Bold.ttf')

      expect(result.totalFontFiles).toBe(1)
      expect(result.entries[0].fileName).toBe('Amiri-Bold.ttf')
      expect(result.entries[0].format).toBe('ttf')
      expect(result.entries[0].buffer).toEqual(directTtf)
    })
  })
})
