<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { Eye, EyeOff, Lock, UserCheck } from 'lucide-vue-next'

const router = useRouter()
const { register, checkUsernameAvailability } = useAuth()
const { success, error } = useToast()
const { t } = useI18n()

const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isUsernameAvailable = ref<boolean | null>(null)
const isCheckingUsername = ref(false)
const isSubmitting = ref(false)
const formError = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(username, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const clean = val.trim().toLowerCase()
  if (!clean || clean.length < 3 || !/^[a-z0-9_-]{3,30}$/.test(clean)) {
    isUsernameAvailable.value = null
    isCheckingUsername.value = false
    return
  }
  isCheckingUsername.value = true
  debounceTimer = setTimeout(async () => {
    isUsernameAvailable.value = await checkUsernameAvailability(clean)
    isCheckingUsername.value = false
  }, 250)
})

async function handleRegister() {
  formError.value = null
  const cleanUsername = username.value.trim().toLowerCase()

  if (!/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
    formError.value = t('auth.register.usernameRule')
    return
  }

  if (isUsernameAvailable.value === false) {
    formError.value = t('auth.register.usernameTaken')
    return
  }

  if (password.value.length < 6) {
    formError.value = t('auth.register.passwordTooShort')
    return
  }

  if (password.value !== confirmPassword.value) {
    formError.value = t('auth.register.passwordMismatch')
    return
  }

  isSubmitting.value = true
  try {
    const user = await register({
      username: cleanUsername,
      password: password.value,
      displayName: displayName.value.trim() || undefined
    })
    success(t('auth.register.accountCreated'), t('auth.register.welcomeUser', { username: user.username || cleanUsername }))
    router.push('/repositories')
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.statusMessage || err?.message || t('auth.register.registrationFailed')
    formError.value = msg
    error(t('auth.register.registrationFailed'), msg)
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
          {{ t('auth.register.title') }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t('auth.register.subtitle') }}
        </p>
      </div>

      <div
        v-if="formError"
        role="alert"
        class="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300"
      >
        {{ formError }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="register-username" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ t('auth.register.username') }}
            </label>
            <span v-if="isCheckingUsername" class="text-[11px] text-slate-400">
              {{ t('auth.register.checkingUsername') }}
            </span>
            <span v-else-if="isUsernameAvailable === true" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {{ t('auth.register.usernameAvailable') }}
            </span>
            <span v-else-if="isUsernameAvailable === false" class="text-[11px] text-red-600 dark:text-red-400 font-semibold">
              {{ t('auth.register.usernameTaken') }}
            </span>
          </div>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 text-xs font-mono pointer-events-none">@</span>
            <input
              id="register-username"
              v-model="username"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.register.usernamePlaceholder')"
              required
              class="w-full ps-7 pe-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <p class="text-[11px] text-slate-400">
            {{ t('auth.register.usernameRule') }}
          </p>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="register-display-name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ t('auth.register.displayName') }}
            </label>
            <span class="text-[11px] text-slate-400">{{ t('auth.register.optional') }}</span>
          </div>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
              <UserCheck class="w-4 h-4" />
            </span>
            <input
              id="register-display-name"
              v-model="displayName"
              type="text"
              autocomplete="name"
              :placeholder="t('auth.register.displayNamePlaceholder')"
              class="w-full ps-9 pe-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="register-password" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ t('auth.register.password') }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
              <Lock class="w-4 h-4" />
            </span>
            <input
              id="register-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :placeholder="t('auth.register.passwordPlaceholder')"
              required
              minlength="6"
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

        <div class="space-y-1.5">
          <label for="register-confirm-password" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ t('auth.register.confirmPassword') }}
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
              <Lock class="w-4 h-4" />
            </span>
            <input
              id="register-confirm-password"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :placeholder="t('auth.register.confirmPasswordPlaceholder')"
              required
              minlength="6"
              class="w-full ps-9 pe-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <Button type="submit" variant="primary" class="w-full justify-center py-2.5" :loading="isSubmitting">
          {{ t('auth.register.submit') }}
        </Button>
      </form>

      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        {{ t('auth.register.hasAccount') }}
        <NuxtLink to="/auth/login" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline ms-1">
          {{ t('auth.register.signIn') }}
        </NuxtLink>
      </div>
    </div>
  </Container>
</template>
