import { describe, expect, it } from 'vitest'

import { getSafeRedirectPath } from './safeRedirect'

describe('getSafeRedirectPath', () => {
  it('returns the fallback when the redirect is missing', () => {
    expect(getSafeRedirectPath(null, '/fallback')).toBe('/fallback')
  })

  it('allows same-origin absolute paths', () => {
    expect(getSafeRedirectPath('/interview/settings')).toBe('/interview/settings')
  })

  it('rejects protocol-relative redirects', () => {
    expect(getSafeRedirectPath('//evil.example.com')).toBe('/interview')
  })

  it('rejects non-path redirects', () => {
    expect(getSafeRedirectPath('https://evil.example.com')).toBe('/interview')
  })
})
