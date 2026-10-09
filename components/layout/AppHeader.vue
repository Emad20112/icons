<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import Container from './Container.vue'
import Button from '../ui/Button.vue'
import Badge from '../ui/Badge.vue'

const { user, role, isAdmin, availableProfiles, switchRole, selectProfile, logout } = useAuth()
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
    <Container class="flex h-16 items-center justify-between">
      <!-- Left: Logo & Nav -->
      <div class="flex items-center gap-8">
        <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <span class="text-base tracking-tight font-semibold">DigitalAssets</span>
            <span class="ml-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">Phase 0</span>
          </div>
        </NuxtLink>

        <nav class="hidden md:flex items-center gap-6 text-sm font-medium">
          <NuxtLink
            to="/"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            Assets Catalog
          </NuxtLink>
          <NuxtLink
            to="/admin"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            Admin & Governance
          </NuxtLink>
          <NuxtLink
            to="/admin/audit"
            class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            active-class="text-blue-600 dark:text-blue-400 font-semibold"
          >
            Audit Logs
          </NuxtLink>
        </nav>
      </div>

      <!-- Right: Role Switcher & User Profile -->
      <div class="flex items-center gap-3">
        <!-- Interactive RLS Role Simulator Badge -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span class="text-[11px] font-semibold text-slate-500 uppercase px-2">Role:</span>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
            :class="role === 'ADMIN' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'"
            @click="switchRole('ADMIN')"
          >
            ADMIN
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
            :class="role === 'USER' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'"
            @click="switchRole('USER')"
          >
            USER
          </button>
        </div>

        <!-- User Info / Avatar -->
        <div v-if="user" class="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <img
            :src="user.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'"
            :alt="user.display_name || user.email"
            class="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
          />
          <div class="hidden sm:block text-left">
            <div class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
              {{ user.display_name || user.email.split('@')[0] }}
            </div>
            <div class="text-[10px] text-slate-500">
              {{ role }}
            </div>
          </div>
        </div>
        <div v-else class="flex items-center gap-2">
          <NuxtLink to="/auth/login">
            <Button size="sm" variant="outline">Sign In</Button>
          </NuxtLink>
        </div>
      </div>
    </Container>
  </header>
</template>
