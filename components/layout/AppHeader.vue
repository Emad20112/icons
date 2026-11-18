<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useTheme } from '../../composables/useTheme'
import Container from './Container.vue'
import Button from '../ui/Button.vue'
import LocaleSwitcher from '../i18n/LocaleSwitcher.vue'
import {
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  LayoutGrid,
  FileImage,
  Sparkles,
  PenTool,
  Type,
  FolderGit2,
  User,
  LogOut,
  Shapes
} from 'lucide-vue-next'

const { user, logout } = useAuth()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()
const route = useRoute()

const isMobileMenuOpen = ref(false)
const isToolsMenuOpen = ref(false)
const isUserMenuOpen = ref(false)

const toolsMenuRef = ref<HTMLElement | null>(null)
const userMenuRef = ref<HTMLElement | null>(null)

const isToolsActive = computed(() => route.path.startsWith('/tools'))

const isNavActive = (path: string) => {
  if (path === '/') {
    return route.path === '/' || route.path === '/icons/explore'
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  isToolsMenuOpen.value = false
  isUserMenuOpen.value = false
}

const closeAllMenus = () => {
  isMobileMenuOpen.value = false
  isToolsMenuOpen.value = false
  isUserMenuOpen.value = false
}

const handleLogout = async () => {
  closeAllMenus()
  await logout()
  await navigateTo('/')
}

watch(
  () => route.fullPath,
  () => {
    closeAllMenus()
  }
)

watch(isMobileMenuOpen, (isOpen) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeAllMenus()
  }
}

const onDocumentPointerDown = (e: MouseEvent) => {
  const target = e.target as Node
  if (isToolsMenuOpen.value && toolsMenuRef.value && !toolsMenuRef.value.contains(target)) {
    isToolsMenuOpen.value = false
  }
  if (isUserMenuOpen.value && userMenuRef.value && !userMenuRef.value.contains(target)) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('mousedown', onDocumentPointerDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onDocumentPointerDown)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 transition-colors duration-200">
    <Container class="flex h-16 items-center justify-between gap-4">
      <!-- Zone 1: Brand Wordmark -->
      <NuxtLink
        to="/"
        class="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-white shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg py-1 pe-1"
      >
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <span class="text-base tracking-tight whitespace-nowrap">{{ t('header.brand') }}</span>
      </NuxtLink>

      <!-- Zone 2: Primary Desktop Navigation (Clean 4-item bar) -->
      <nav class="hidden lg:flex items-center gap-1 text-sm font-medium">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 whitespace-nowrap shrink-0 transition-colors"
          :class="isNavActive('/')
            ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800/80 dark:text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'"
        >
          <Shapes class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{{ t('header.nav.iconify') }}</span>
        </NuxtLink>

        <NuxtLink
          to="/fonts"
          class="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 whitespace-nowrap shrink-0 transition-colors"
          :class="isNavActive('/fonts')
            ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800/80 dark:text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'"
        >
          <Type class="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{{ t('header.nav.fonts') }}</span>
        </NuxtLink>

        <NuxtLink
          to="/repositories"
          class="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 whitespace-nowrap shrink-0 transition-colors"
          :class="isNavActive('/repositories')
            ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800/80 dark:text-white'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'"
        >
          <FolderGit2 class="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{{ t('header.nav.repositories') }}</span>
        </NuxtLink>

        <!-- Tools Popover Dropdown -->
        <div ref="toolsMenuRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="isToolsActive || isToolsMenuOpen
              ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800/80 dark:text-white'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'"
            :aria-expanded="isToolsMenuOpen"
            aria-haspopup="menu"
            @click="isToolsMenuOpen = !isToolsMenuOpen; isUserMenuOpen = false"
          >
            <PenTool class="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{{ t('header.nav.tools') }}</span>
            <ChevronDown
              class="h-3.5 w-3.5 text-slate-400 transition-transform duration-150"
              :class="{ 'rotate-180': isToolsMenuOpen }"
            />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="isToolsMenuOpen"
              role="menu"
              class="absolute start-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <NuxtLink
                to="/tools/icon-editor"
                role="menuitem"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                active-class="bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                @click="isToolsMenuOpen = false"
              >
                <PenTool class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{{ t('header.nav.iconEditor') }}</span>
              </NuxtLink>
              <NuxtLink
                to="/tools/image-to-icon"
                role="menuitem"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                active-class="bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                @click="isToolsMenuOpen = false"
              >
                <FileImage class="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{{ t('header.nav.imageToIcon') }}</span>
              </NuxtLink>
              <NuxtLink
                to="/tools/image-to-svg"
                role="menuitem"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                active-class="bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                @click="isToolsMenuOpen = false"
              >
                <Sparkles class="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{{ t('header.nav.imageToSvg') }}</span>
              </NuxtLink>
            </div>
          </Transition>
        </div>
      </nav>

      <!-- Zone 3: Utility & Account Controls -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Theme Toggle -->
        <button
          type="button"
          :title="isDark ? t('header.themeLight') : t('header.themeDark')"
          :aria-label="t('header.toggleTheme')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="h-4 w-4 text-amber-400" />
          <Moon v-else class="h-4 w-4 text-slate-600" />
        </button>

        <!-- Language Switcher (Desktop & Tablet) -->
        <div class="hidden sm:inline-block shrink-0">
          <LocaleSwitcher />
        </div>

        <!-- Account Controls (Desktop) -->
        <div class="hidden lg:flex items-center gap-2 ps-2 ms-1 border-s border-slate-200 dark:border-slate-800 shrink-0">
          <div v-if="user" ref="userMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 ps-1.5 pe-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :aria-expanded="isUserMenuOpen"
              aria-haspopup="menu"
              @click="isUserMenuOpen = !isUserMenuOpen; isToolsMenuOpen = false"
            >
              <img
                :src="user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`"
                :alt="user.display_name || user.username"
                class="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 object-cover shrink-0"
              />
              <span class="max-w-[110px] truncate text-xs font-semibold">
                {{ user.display_name || user.username }}
              </span>
              <ChevronDown
                class="h-3.5 w-3.5 text-slate-400 transition-transform duration-150"
                :class="{ 'rotate-180': isUserMenuOpen }"
              />
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 translate-y-1 scale-95"
            >
              <div
                v-if="isUserMenuOpen"
                role="menu"
                class="absolute end-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div class="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {{ user.display_name || user.username }}
                  </div>
                  <div class="text-[11px] text-slate-500 font-mono truncate">
                    @{{ user.username }}
                  </div>
                </div>

                <NuxtLink
                  to="/dashboard"
                  role="menuitem"
                  class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  @click="isUserMenuOpen = false"
                >
                  <LayoutGrid class="h-4 w-4 text-slate-400" />
                  <span>{{ t('header.nav.dashboard') }}</span>
                </NuxtLink>

                <NuxtLink
                  to="/repositories"
                  role="menuitem"
                  class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  @click="isUserMenuOpen = false"
                >
                  <FolderGit2 class="h-4 w-4 text-slate-400" />
                  <span>{{ t('header.myRepositories') }}</span>
                </NuxtLink>

                <NuxtLink
                  v-if="user.username"
                  :to="`/@${user.username}`"
                  role="menuitem"
                  class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  @click="isUserMenuOpen = false"
                >
                  <User class="h-4 w-4 text-slate-400" />
                  <span>{{ t('header.publicProfile') }}</span>
                </NuxtLink>

                <div class="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                  @click="handleLogout"
                >
                  <LogOut class="h-4 w-4" />
                  <span>{{ t('header.signOut') }}</span>
                </button>
              </div>
            </Transition>
          </div>

          <div v-else class="flex items-center gap-2">
            <NuxtLink to="/auth/login">
              <Button size="sm" variant="outline" class="whitespace-nowrap">
                {{ t('header.signIn') }}
              </Button>
            </NuxtLink>
            <NuxtLink to="/auth/register">
              <Button size="sm" variant="primary" class="whitespace-nowrap">
                {{ t('header.createAccount') }}
              </Button>
            </NuxtLink>
          </div>
        </div>

        <!-- Mobile & Tablet Menu Button -->
        <button
          type="button"
          :aria-label="isMobileMenuOpen ? t('header.closeMenu') : t('header.menu')"
          :aria-expanded="isMobileMenuOpen"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors lg:hidden shrink-0"
          @click="toggleMobileMenu"
        >
          <X v-if="isMobileMenuOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>
    </Container>

    <!-- Mobile & Tablet Drawer -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-x-0 top-16 z-50 border-b border-slate-200 bg-white/98 dark:border-slate-800 dark:bg-slate-950/98 backdrop-blur-md shadow-2xl lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        <Container class="py-5 space-y-6">
          <!-- Explore Section -->
          <div class="space-y-1">
            <div class="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ t('header.exploreSection') }}
            </div>

            <NuxtLink
              to="/"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors"
              :class="isNavActive('/')
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'"
              @click="closeAllMenus"
            >
              <Shapes class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{{ t('header.nav.iconify') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/fonts"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors"
              :class="isNavActive('/fonts')
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'"
              @click="closeAllMenus"
            >
              <Type class="h-4 w-4 text-slate-400 shrink-0" />
              <span>{{ t('header.nav.fonts') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/repositories"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors"
              :class="isNavActive('/repositories')
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'"
              @click="closeAllMenus"
            >
              <FolderGit2 class="h-4 w-4 text-slate-400 shrink-0" />
              <span>{{ t('header.nav.repositories') }}</span>
            </NuxtLink>
          </div>

          <!-- Creation & Conversion Tools Section -->
          <div class="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ t('header.toolsSection') }}
            </div>

            <NuxtLink
              to="/tools/icon-editor"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 min-h-[44px] transition-colors"
              active-class="bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
              @click="closeAllMenus"
            >
              <PenTool class="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{{ t('header.nav.iconEditor') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/tools/image-to-icon"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 min-h-[44px] transition-colors"
              active-class="bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
              @click="closeAllMenus"
            >
              <FileImage class="h-4 w-4 text-slate-400 shrink-0" />
              <span>{{ t('header.nav.imageToIcon') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/tools/image-to-svg"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 min-h-[44px] transition-colors"
              active-class="bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
              @click="closeAllMenus"
            >
              <Sparkles class="h-4 w-4 text-slate-400 shrink-0" />
              <span>{{ t('header.nav.imageToSvg') }}</span>
            </NuxtLink>
          </div>

          <!-- Account & Preferences Section -->
          <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ t('header.accountSection') }}
            </div>

            <div class="flex items-center justify-between px-3 py-1">
              <span class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ t('header.language') }}</span>
              <LocaleSwitcher />
            </div>

            <div v-if="user" class="space-y-1.5 pt-1">
              <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <img
                  :src="user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`"
                  :alt="user.display_name || user.username"
                  class="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                />
                <div class="min-w-0 flex-1 text-start">
                  <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {{ user.display_name || user.username }}
                  </div>
                  <div class="text-xs text-slate-500 font-mono truncate">
                    @{{ user.username }}
                  </div>
                </div>
              </div>

              <NuxtLink
                to="/dashboard"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 min-h-[44px]"
                @click="closeAllMenus"
              >
                <LayoutGrid class="h-4 w-4 text-slate-400" />
                <span>{{ t('header.nav.dashboard') }}</span>
              </NuxtLink>

              <NuxtLink
                v-if="user.username"
                :to="`/@${user.username}`"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 min-h-[44px]"
                @click="closeAllMenus"
              >
                <User class="h-4 w-4 text-slate-400" />
                <span>{{ t('header.publicProfile') }}</span>
              </NuxtLink>

              <button
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[44px]"
                @click="handleLogout"
              >
                <LogOut class="h-4 w-4" />
                <span>{{ t('header.signOut') }}</span>
              </button>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-1 pt-1">
              <NuxtLink to="/auth/login" class="block" @click="closeAllMenus">
                <Button size="md" variant="outline" class="w-full justify-center min-h-[44px]">
                  {{ t('header.signIn') }}
                </Button>
              </NuxtLink>
              <NuxtLink to="/auth/register" class="block" @click="closeAllMenus">
                <Button size="md" variant="primary" class="w-full justify-center min-h-[44px]">
                  {{ t('header.createAccount') }}
                </Button>
              </NuxtLink>
            </div>
          </div>
        </Container>
      </div>
    </Transition>
  </header>
</template>
