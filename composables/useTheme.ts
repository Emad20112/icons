import { ref, computed } from 'vue'

export type ThemeMode = 'light' | 'dark'

const currentTheme = ref<ThemeMode>('light')
const isInitialized = ref(false)

export function useTheme() {
  const initTheme = () => {
    if (typeof window === 'undefined') return
    if (isInitialized.value) return

    const stored = localStorage.getItem('theme_mode') as ThemeMode | null
    if (stored === 'light' || stored === 'dark') {
      currentTheme.value = stored
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme.value = 'dark'
    } else {
      currentTheme.value = 'light'
    }

    applyTheme(currentTheme.value)
    isInitialized.value = true

    // Listen to OS preference changes if no manual override is set
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme_mode')) {
        currentTheme.value = e.matches ? 'dark' : 'light'
        applyTheme(currentTheme.value)
      }
    })
  }

  const applyTheme = (theme: ThemeMode) => {
    if (typeof document === 'undefined') return
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    const next: ThemeMode = currentTheme.value === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  const setTheme = (theme: ThemeMode) => {
    currentTheme.value = theme
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_mode', theme)
    }
    applyTheme(theme)
  }

  return {
    theme: currentTheme,
    isDark: computed(() => currentTheme.value === 'dark'),
    toggleTheme,
    setTheme,
    initTheme
  }
}
