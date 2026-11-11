import { describe, it, expect } from 'vitest'
import { RequestValidator } from '../src/security/validator.js'
import { ValidationError } from '../src/errors/AppError.js'

describe('Backend RequestValidator', () => {
  describe('validatePrefix', () => {
    it('accepts valid collection prefixes', () => {
      expect(RequestValidator.validatePrefix('lucide')).toBe('lucide')
      expect(RequestValidator.validatePrefix('heroicons')).toBe('heroicons')
      expect(RequestValidator.validatePrefix('material-symbols')).toBe('material-symbols')
      expect(RequestValidator.validatePrefix('fa6-solid')).toBe('fa6-solid')
    })

    it('rejects invalid or dangerous prefixes', () => {
      expect(() => RequestValidator.validatePrefix('')).toThrow(ValidationError)
      expect(() => RequestValidator.validatePrefix('../etc')).toThrow(ValidationError)
      expect(() => RequestValidator.validatePrefix('lucide;drop table')).toThrow(ValidationError)
      expect(() => RequestValidator.validatePrefix('invalid/slash')).toThrow(ValidationError)
    })
  })

  describe('validateIconName', () => {
    it('accepts valid icon names', () => {
      expect(RequestValidator.validateIconName('home')).toBe('home')
      expect(RequestValidator.validateIconName('arrow-down-left')).toBe('arrow-down-left')
      expect(RequestValidator.validateIconName('search_outline')).toBe('search_outline')
    })

    it('rejects path traversal and invalid chars in icon names', () => {
      expect(() => RequestValidator.validateIconName('')).toThrow(ValidationError)
      expect(() => RequestValidator.validateIconName('../../secrets')).toThrow(ValidationError)
      expect(() => RequestValidator.validateIconName('name with spaces')).toThrow(ValidationError)
    })
  })

  describe('validateSearchQuery', () => {
    it('normalizes valid search query strings', () => {
      expect(RequestValidator.validateSearchQuery('  home icon  ')).toBe('home icon')
    })

    it('rejects empty queries and queries with control characters', () => {
      expect(() => RequestValidator.validateSearchQuery('')).toThrow(ValidationError)
      expect(() => RequestValidator.validateSearchQuery('null\x00byte')).toThrow(ValidationError)
    })
  })

  describe('validatePagination', () => {
    it('defaults pagination safely when omitted', () => {
      const { limit, start } = RequestValidator.validatePagination(undefined, undefined)
      expect(limit).toBe(40)
      expect(start).toBe(0)
    })

    it('enforces limit and start bounds', () => {
      expect(() => RequestValidator.validatePagination(0, 0)).toThrow(ValidationError)
      expect(() => RequestValidator.validatePagination(101, 0)).toThrow(ValidationError)
      expect(() => RequestValidator.validatePagination(20, -5)).toThrow(ValidationError)

      const valid = RequestValidator.validatePagination('50', '100')
      expect(valid.limit).toBe(50)
      expect(valid.start).toBe(100)
    })
  })

  describe('validateUpstreamUrl (SSRF Protection)', () => {
    it('approves official Iconify API endpoints', () => {
      expect(() => RequestValidator.validateUpstreamUrl('https://api.iconify.design/search?query=home')).not.toThrow()
      expect(() => RequestValidator.validateUpstreamUrl('https://api.simplesvg.com/lucide.json')).not.toThrow()
    })

    it('rejects arbitrary external URLs or insecure schemes', () => {
      expect(() => RequestValidator.validateUpstreamUrl('http://api.iconify.design/search')).toThrow(ValidationError)
      expect(() => RequestValidator.validateUpstreamUrl('https://malicious-site.com/steal')).toThrow(ValidationError)
      expect(() => RequestValidator.validateUpstreamUrl('https://169.254.169.254/metadata')).toThrow(ValidationError)
      expect(() => RequestValidator.validateUpstreamUrl('file:///etc/passwd')).toThrow(ValidationError)
    })
  })
})
