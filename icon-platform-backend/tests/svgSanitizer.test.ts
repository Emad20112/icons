import { describe, it, expect } from 'vitest'
import { SvgSanitizer } from '../src/security/svgSanitizer.js'

describe('SvgSanitizer Security', () => {
  it('strips <script> tags and active event handlers from SVG', () => {
    const maliciousSvg = `<svg viewBox="0 0 24 24"><script>alert("XSS")</script><circle cx="12" cy="12" r="10" onload="fetch('//evil.com')"/></svg>`
    const clean = SvgSanitizer.sanitize(maliciousSvg)

    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('alert')
    expect(clean).not.toContain('onload')
    expect(clean).toContain('<circle')
    expect(clean).toContain('viewBox="0 0 24 24"')
  })

  it('strips dangerous href javascript payloads and iframes', () => {
    const maliciousSvg = `<svg><a href="javascript:alert(1)"><text>Click</text></a><iframe src="evil.html"></iframe></svg>`
    const clean = SvgSanitizer.sanitize(maliciousSvg)

    expect(clean).not.toContain('javascript:')
    expect(clean).not.toContain('<iframe')
    expect(clean).toContain('<text>Click</text>')
  })

  it('builds a valid standalone SVG from icon body and options', () => {
    const body = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
    const svg = SvgSanitizer.buildSvg({
      body,
      width: 24,
      height: 24,
      color: '#3b82f6',
      size: 32,
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 24 24"')
    expect(svg).toContain('width="32"')
    expect(svg).toContain('height="32"')
    expect(svg).toContain('color="#3b82f6"')
    expect(svg).toContain(body)
  })
})
