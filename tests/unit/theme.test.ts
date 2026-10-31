import { describe, it, expect, beforeEach } from 'vitest'
import { useTheme } from '../../composables/useTheme'

describe('Theme Composable (useTheme) - Dark & Light Mode', () => {
  beforeEach(() => {
    // Reset document classes and localStorage mock
    if (typeof document !== 'undefined') {
      document.documentElement.className = ''
    }
  })

  it('provides reactive theme state and toggle functionality', () => {
    const { theme, isDark, toggleTheme, setTheme } = useTheme()

    // Explicitly set to light
    setTheme('light')
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)

    // Toggle to dark
    toggleTheme()
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)

    // Toggle back to light
    toggleTheme()
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
  })

  it('correctly sets explicit theme', () => {
    const { theme, isDark, setTheme } = useTheme()

    setTheme('dark')
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)

    setTheme('light')
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
  })
})
