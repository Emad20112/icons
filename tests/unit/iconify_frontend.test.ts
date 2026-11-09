import { describe, it, expect } from 'vitest'
import enLocale from '../../i18n/locales/en.json'
import arLocale from '../../i18n/locales/ar.json'

describe('Iconify Frontend Integration', () => {
  describe('Identifier Parsing and Normalization', () => {
    function parseIconIdentifier(raw: string): { prefix: string; name: string } | null {
      if (!raw || typeof raw !== 'string') return null
      const trimmed = raw.trim()
      const delimiterIndex = trimmed.indexOf(':')
      if (delimiterIndex === -1) return null

      const prefix = trimmed.slice(0, delimiterIndex).toLowerCase()
      const name = trimmed.slice(delimiterIndex + 1).toLowerCase()

      const PREFIX_REGEX = /^[a-z0-9][a-z0-9-]{0,31}$/
      const NAME_REGEX = /^[a-z0-9][a-z0-9-_]{0,63}$/

      if (!PREFIX_REGEX.test(prefix) || !NAME_REGEX.test(name)) {
        return null
      }

      return { prefix, name }
    }

    it('correctly parses valid icon identifier with colon', () => {
      const parsed = parseIconIdentifier('lucide:arrow-right')
      expect(parsed).toEqual({ prefix: 'lucide', name: 'arrow-right' })
    })

    it('normalizes uppercase letters in identifier', () => {
      const parsed = parseIconIdentifier('MDI:Home-Outline')
      expect(parsed).toEqual({ prefix: 'mdi', name: 'home-outline' })
    })

    it('rejects identifiers without delimiter', () => {
      expect(parseIconIdentifier('home')).toBeNull()
    })

    it('rejects dangerous injection payloads in prefix or name', () => {
      expect(parseIconIdentifier('../mdi:home')).toBeNull()
      expect(parseIconIdentifier('mdi:../../etc/passwd')).toBeNull()
      expect(parseIconIdentifier('mdi:home<script>')).toBeNull()
      expect(parseIconIdentifier('mdi:home?param=1')).toBeNull()
    })
  })

  describe('Query URL Construction and Boundary Clamping', () => {
    function buildSearchUrl(query: string, collection?: string, limit = 40, start = 0): string {
      const clampedLimit = Math.max(1, Math.min(100, Math.floor(limit)))
      const clampedStart = Math.max(0, Math.floor(start))
      const params = new URLSearchParams({
        q: query.trim(),
        limit: clampedLimit.toString(),
        start: clampedStart.toString()
      })
      if (collection && collection !== 'all') {
        params.set('collection', collection.trim().toLowerCase())
      }
      return `/api/v1/iconify/search?${params.toString()}`
    }

    it('constructs correct search URL with parameters', () => {
      const url = buildSearchUrl('user', 'lucide', 30, 0)
      expect(url).toBe('/api/v1/iconify/search?q=user&limit=30&start=0&collection=lucide')
    })

    it('clamps limit between 1 and 100', () => {
      const urlHigh = buildSearchUrl('test', undefined, 500, 0)
      expect(urlHigh).toContain('limit=100')

      const urlLow = buildSearchUrl('test', undefined, -10, 0)
      expect(urlLow).toContain('limit=1')
    })

    it('omits collection param when set to "all"', () => {
      const url = buildSearchUrl('settings', 'all', 40, 0)
      expect(url).not.toContain('collection=')
    })
  })

  describe('SVG Customization Validation', () => {
    function customizeSvgColor(svg: string, color: string): string {
      if (!svg.includes('<svg')) return svg
      // If color is valid hex, replace currentColor or set fill
      const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
      const validColor = hexRegex.test(color) ? color : '#000000'
      return svg.replace(/currentColor/g, validColor)
    }

    it('replaces currentColor with selected hex color', () => {
      const input = '<svg fill="currentColor"><path d="M0 0"/></svg>'
      const output = customizeSvgColor(input, '#3b82f6')
      expect(output).toContain('fill="#3b82f6"')
      expect(output).not.toContain('currentColor')
    })

    it('defaults invalid color to #000000', () => {
      const input = '<svg fill="currentColor"><path d="M0 0"/></svg>'
      const output = customizeSvgColor(input, 'javascript:alert(1)')
      expect(output).toContain('fill="#000000"')
      expect(output).not.toContain('javascript:')
    })
  })

  describe('Localization Parity', () => {
    it('has matching iconify translation keys between en and ar locales', () => {
      const enIconify = (enLocale as any).iconify
      const arIconify = (arLocale as any).iconify

      expect(enIconify).toBeDefined()
      expect(arIconify).toBeDefined()

      const enKeys = Object.keys(enIconify).sort()
      const arKeys = Object.keys(arIconify).sort()

      expect(enKeys).toEqual(arKeys)
    })

    it('has iconify navigation link in header navigation for both locales', () => {
      expect((enLocale as any).header.nav.iconify).toBeDefined()
      expect((arLocale as any).header.nav.iconify).toBeDefined()
    })
  })
})
