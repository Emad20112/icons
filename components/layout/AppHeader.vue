<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
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
  LayoutGrid,
  FileImage,
  Sparkles,
  PenTool,
  ShieldCheck,
  FileText
} from 'lucide-vue-next'

const { user, role, switchRole } = useAuth()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()
const route = useRoute()

const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Close mobile menu on route navigation
watch(
  () => route.fullPath,
  () => {
    closeMobileMenu()
  }
)

// Handle Escape key to close mobile menu
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

// Lock body scrolling when mobile menu is active
watch(isMobileMenuOpen, (isOpen) => {
  if (typeof document !== 'undefined') {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 transition-colors duration-200">
    <Container class="flex h-16 items-center justify-between gap-3 sm:gap-6">
      <!-- Zone 1: Logo & Brand Wordmark -->
      <div class="flex items-center gap-6 xl:gap-8 shrink-0">
        <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white shrink-0">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shrink-0">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-base tracking-tight font-semibold whitespace-nowrap">{{ t('header.brand') }}</span>
            <span class="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded whitespace-nowrap">
              {{ t('header.phaseBadge') }}
            </span>
          </div>
        </NuxtLink>

        <!-- Zone 2: Desktop Navigation Links (Large Screens) -->
        <nav class="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium">
          <NuxtLink
            to="/"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors whitespace-nowrap"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            {{ t('header.nav.catalog') }}
          </NuxtLink>
          <NuxtLink
            to="/tools/image-to-icon"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            <span>{{ t('header.nav.imageToIcon') }}</span>
          </NuxtLink>
          <NuxtLink
            to="/tools/image-to-svg"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            <span>{{ t('header.nav.imageToSvg') }}</span>
          </NuxtLink>
          <NuxtLink
            to="/tools/icon-editor"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            <span>{{ t('header.nav.iconEditor') }}</span>
            <span class="rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap">
              {{ t('header.nav.toolBadge') }}
            </span>
          </NuxtLink>
          <NuxtLink
            to="/admin"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors whitespace-nowrap"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            {{ t('header.nav.admin') }}
          </NuxtLink>
          <NuxtLink
            to="/admin/audit"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors whitespace-nowrap"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            {{ t('header.nav.audit') }}
          </NuxtLink>
        </nav>
      </div>

      <!-- Zone 3: Controls Cluster (Theme, Language, Role Switcher, Profile, Menu Toggle) -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- Dark Mode Toggle Button (Always visible on all screens) -->
        <button
          type="button"
          :title="isDark ? t('header.themeLight') : t('header.themeDark')"
          :aria-label="t('header.toggleTheme')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
          <Moon v-else class="h-4 w-4 text-slate-600 transition-transform duration-200 hover:-rotate-12" />
        </button>

        <!-- Language Switcher (Visible on SM+ screens) -->
        <div class="hidden sm:inline-block shrink-0">
          <LocaleSwitcher />
        </div>

        <!-- Role Simulator Badge (Visible on XL+ screens) -->
        <div class="hidden xl:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
          <span class="text-[11px] font-semibold text-slate-500 uppercase px-2 whitespace-nowrap">{{ t('header.role') }}</span>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap"
            :class="role === 'ADMIN' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'"
            @click="switchRole('ADMIN')"
          >
            {{ t('roles.admin') }}
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap"
            :class="role === 'USER' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'"
            @click="switchRole('USER')"
          >
            {{ t('roles.user') }}
          </button>
        </div>

        <!-- User Info / Avatar -->
        <div v-if="user" class="hidden sm:flex items-center gap-2 ps-2 border-s border-slate-200 dark:border-slate-700 shrink-0">
          <img
            :src="user.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'"
            :alt="user.display_name || user.email"
            class="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
          />
          <div class="hidden md:block text-start">
            <div class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[110px]">
              {{ user.display_name || user.email.split('@')[0] }}
            </div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400">
              {{ role === 'ADMIN' ? t('roles.admin') : t('roles.user') }}
            </div>
          </div>
        </div>
        <div v-else class="hidden sm:flex items-center gap-2 shrink-0">
          <NuxtLink to="/auth/login">
            <Button size="sm" variant="outline">{{ t('header.signIn') }}</Button>
          </NuxtLink>
        </div>

        <!-- Mobile & Tablet Navigation Toggle Button (Visible on screens < lg) -->
        <button
          type="button"
          :aria-label="isMobileMenuOpen ? t('header.closeMenu') : t('header.menu')"
          :aria-expanded="isMobileMenuOpen"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors lg:hidden shrink-0"
          @click="toggleMobileMenu"
        >
          <X v-if="isMobileMenuOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>
    </Container>

    <!-- Mobile & Tablet Responsive Drawer / Menu Dropdown -->
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
        class="fixed inset-x-0 top-16 z-50 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        <div class="p-4 sm:p-6 space-y-6">
          <!-- Navigation Links Section -->
          <div class="space-y-1">
            <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pb-2">
              {{ t('header.toolsSection') }}
            </div>

            <NuxtLink
              to="/"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              active-class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold"
              @click="closeMobileMenu"
            >
              <LayoutGrid class="h-4 w-4 text-slate-400" />
              <span>{{ t('header.nav.catalog') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/tools/image-to-icon"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              active-class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold"
              @click="closeMobileMenu"
            >
              <FileImage class="h-4 w-4 text-slate-400" />
              <span>{{ t('header.nav.imageToIcon') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/tools/image-to-svg"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              active-class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold"
              @click="closeMobileMenu"
            >
              <Sparkles class="h-4 w-4 text-slate-400" />
              <span>{{ t('header.nav.imageToSvg') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/tools/icon-editor"
              class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              active-class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold"
              @click="closeMobileMenu"
            >
              <div class="flex items-center gap-3">
                <PenTool class="h-4 w-4 text-blue-500" />
                <span>{{ t('header.nav.iconEditor') }}</span>
              </div>
              <span class="rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5">
                {{ t('header.nav.toolBadge') }}
              </span>
            </NuxtLink>
          </div>

          <!-- Admin Section -->
          <div class="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pb-2">
              {{ t('header.adminSection') }}
            </div>

            <NuxtLink
              to="/admin"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              active-class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold"
              @click="closeMobileMenu"
            >
              <ShieldCheck class="h-4 w-4 text-slate-400" />
              <span>{{ t('header.nav.admin') }}</span>
            </NuxtLink>

            <NuxtLink
              to="/admin/audit"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              active-class="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold"
              @click="closeMobileMenu"
            >
              <FileText class="h-4 w-4 text-slate-400" />
              <span>{{ t('header.nav.audit') }}</span>
            </NuxtLink>
          </div>

          <!-- Settings & Simulation Section -->
          <div class="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <!-- Language Switcher on mobile -->
            <div class="flex items-center justify-between px-3 py-1">
              <span class="text-xs font-medium text-slate-600 dark:text-slate-400">{{ t('header.language') }}</span>
              <LocaleSwitcher />
            </div>

            <!-- Role Simulator on mobile -->
            <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{{ t('header.role') }}</span>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
                  :class="role === 'ADMIN' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'"
                  @click="switchRole('ADMIN')"
                >
                  {{ t('roles.admin') }}
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
                  :class="role === 'USER' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'"
                  @click="switchRole('USER')"
                >
                  {{ t('roles.user') }}
                </button>
              </div>
            </div>

            <!-- User Auth status on mobile -->
            <div class="pt-2">
              <div v-if="user" class="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <img
                  :src="user.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'"
                  :alt="user.display_name || user.email"
                  class="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
                <div class="text-start truncate">
                  <div class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {{ user.display_name || user.email.split('@')[0] }}
                  </div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">
                    {{ role === 'ADMIN' ? t('roles.admin') : t('roles.user') }}
                  </div>
                </div>
              </div>
              <div v-else class="px-3">
                <NuxtLink to="/auth/login" class="block w-full" @click="closeMobileMenu">
                  <Button size="md" variant="primary" class="w-full justify-center">{{ t('header.signIn') }}</Button>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>
