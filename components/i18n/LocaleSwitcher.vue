<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SUPPORTED_LOCALES } from '~/i18n/locales'
import type { SupportedLocale } from '~/i18n/locales'

const { locale, t, setLocale } = useI18n()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

// Driven by the shared locale registry (`i18n/locales.ts`) so the list and
// `setLocale` share one narrow `'en' | 'ar'` type.
const availableLocales = computed(() => SUPPORTED_LOCALES)

const currentLocale = computed(
  () => availableLocales.value.find((l) => l.code === locale.value) || availableLocales.value[0]
)

const shortCode = (code: string) => (code === 'ar' ? 'ع' : code.toUpperCase())

async function selectLocale(code: SupportedLocale['code']) {
  if (code !== locale.value) {
    // `setLocale` re-renders in place (no full page reload) and the module
    // syncs `detectBrowserLanguage.cookieKey` so SSR keeps the choice.
    await setLocale(code)
  }
  isOpen.value = false
  triggerRef.value?.focus()
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault()
    isOpen.value = true
  }
}

function onMenuKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    isOpen.value = false
    triggerRef.value?.focus()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const items = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    )
    if (items.length === 0) return
    const idx = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown'
      ? (idx + 1) % items.length
      : (idx - 1 + items.length) % items.length
    items[next]?.focus()
  }
}

function onDocumentPointerDown(e: MouseEvent) {
  if (isOpen.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentPointerDown))
onUnmounted(() => document.removeEventListener('mousedown', onDocumentPointerDown))
</script>

<template>
  <div ref="rootRef" class="relative inline-block">
    <button
      ref="triggerRef"
      type="button"
      class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      :aria-label="t('header.selectLanguage')"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click="isOpen = !isOpen"
      @keydown="onTriggerKeydown"
    >
      <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span aria-hidden="true">{{ shortCode(currentLocale.code) }}</span>
      <svg class="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <ul
      v-if="isOpen"
      role="menu"
      :aria-label="t('header.language')"
      class="absolute top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg end-0 dark:border-slate-700 dark:bg-slate-900"
      @keydown="onMenuKeydown"
    >
      <li v-for="l in availableLocales" :key="l.code" role="none">
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center justify-between gap-3 px-3 py-2 text-xs font-medium text-start transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          :class="l.code === locale ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'"
          :aria-current="l.code === locale ? 'true' : undefined"
          @click="selectLocale(l.code)"
        >
          <span>{{ l.name }}</span>
          <span class="font-mono text-[10px] uppercase text-slate-400">{{ shortCode(l.code) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
