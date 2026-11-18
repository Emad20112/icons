<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { Eye, EyeOff, Lock, User } from 'lucide-vue-next'

const router = useRouter()
const { login } = useAuth()
const { success, error } = useToast()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const formError = ref<string | null>(null)

async function handleLogin() {
  formError.value = null
  const cleanUsername = username.value.trim()
  if (!cleanUsername || !password.value) return

  isSubmitting.value = true
  try {
    const user = await login(cleanUsername, password.value)
    success(t('auth.login.authSuccess'), `@${user.username || user.email}`)
    router.push('/repositories')
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.statusMessage || err?.message || t('auth.login.authFailed')
    formError.value = msg
    error(t('auth.login.authFailed'), msg)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Container class="max-w-md py-12">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      <div class="text-center space-y-1.5">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {{ t('auth.login.title') }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t('auth.login.subtitle') }}
        </p>
      </div>

      <div
        v-if="formError"
        role="alert"
        class="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300"
      >
        {{ formError }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-1.5">
          <label for="login-username" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ t('auth.login.identifier') }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
              <User class="w-4 h-4" />
            </span>
            <input
              id="login-username"
              v-model="username"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.login.identifierPlaceholder')"
              required
              class="w-full ps-9 pe-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="login-password" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ t('auth.login.password') }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
              <Lock class="w-4 h-4" />
            </span>
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              :placeholder="t('auth.login.passwordPlaceholder')"
              required
              class="w-full ps-9 pe-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
              class="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button type="submit" variant="primary" class="w-full justify-center py-2.5" :loading="isSubmitting">
          {{ t('auth.login.submit') }}
        </Button>
      </form>

      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        {{ t('auth.login.noAccount') }}
        <NuxtLink to="/auth/register" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline ms-1">
          {{ t('auth.login.signUp') }}
        </NuxtLink>
      </div>
    </div>
  </Container>
</template>
