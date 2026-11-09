<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Card from '../../components/ui/Card.vue'
import Button from '../../components/ui/Button.vue'
import Input from '../../components/ui/Input.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const { login, loginWithGoogle, availableProfiles, selectProfile } = useAuth()
const { success, error } = useToast()
const { t } = useI18n()

const identifier = ref('')
const password = ref('')
const isSubmitting = ref(false)
const isGoogleSubmitting = ref(false)

async function handleLogin() {
  if (!identifier.value) return
  isSubmitting.value = true
  try {
    const user = await login(identifier.value, password.value || undefined)
    success(t('auth.login.authSuccess') || 'تم تسجيل الدخول بنجاح', `@${user.username || user.email}`)
    router.push('/dashboard')
  } catch (err: any) {
    error(t('auth.login.authFailed') || 'فشل تسجيل الدخول', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleLogin() {
  isGoogleSubmitting.value = true
  try {
    const user = await loginWithGoogle()
    success('تم تسجيل الدخول عبر Google', `مرحباً بك @${user.username || user.email}`)
    router.push('/dashboard')
  } catch (err: any) {
    error('فشل الدخول بـ Google', err.statusMessage || err.message)
  } finally {
    isGoogleSubmitting.value = false
  }
}

async function quickSwitch(profileId: string) {
  await selectProfile(profileId)
  success(t('auth.login.profileSwitched') || 'تم تبديل الحساب', t('auth.login.profileLoaded') || 'تم تحميل الملف الشخصي')
  router.push('/dashboard')
}
</script>

<template>
  <Container class="max-w-md py-12">
    <Card>
      <template #header>
        <div class="text-center">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ t('auth.login.title') || 'تسجيل الدخول' }}</h2>
          <p class="text-xs text-slate-500 mt-1">{{ t('auth.login.subtitle') || 'سجل الدخول بحسابك أو باستخدام Google للوصول لمستودعاتك' }}</p>
        </div>
      </template>

      <!-- Google Sign In Button -->
      <div class="mb-4">
        <button
          type="button"
          @click="handleGoogleLogin"
          :disabled="isGoogleSubmitting"
          class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm disabled:opacity-50"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{{ isGoogleSubmitting ? 'جارٍ الاتصال...' : 'الدخول السريع باستخدام Google' }}</span>
        </button>

        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
          <div class="relative flex justify-center text-xs uppercase"><span class="bg-white dark:bg-slate-900 px-2 text-slate-400">أو بالبيانات</span></div>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('auth.login.identifier') || 'اسم المستخدم أو البريد الإلكتروني' }}</label>
          <Input v-model="identifier" type="text" :placeholder="t('auth.login.identifierPlaceholder')" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('auth.login.password') || 'كلمة المرور' }}</label>
          <Input v-model="password" type="password" :placeholder="t('auth.login.passwordPlaceholder')" />
        </div>

        <Button type="submit" variant="primary" class="w-full" :loading="isSubmitting">
          {{ t('auth.login.submit') || 'تسجيل الدخول' }}
        </Button>

        <div class="text-center text-xs text-slate-500 pt-2">
          {{ t('auth.login.noAccount') || 'ليس لديك حساب؟' }}
          <NuxtLink to="/auth/register" class="text-blue-600 font-semibold hover:underline">إنشاء حساب جديد مع اسم مستخدم</NuxtLink>
        </div>
      </form>

      <!-- Quick Session Switcher for Testing Acceptance Criteria -->
      <div v-if="availableProfiles.length > 0" class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <h4 class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {{ t('auth.login.quickTest') || 'تبديل سريع للحسابات التجريبية' }}
        </h4>
        <div class="space-y-2">
          <button
            v-for="p in availableProfiles"
            :key="p.id"
            type="button"
            class="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
            @click="quickSwitch(p.id)"
          >
            <div>
              <div class="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{{ p.display_name }}</span>
                <span class="text-blue-600 font-mono text-[11px]">@{{ p.username || p.email.split('@')[0] }}</span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono">{{ p.email }}</div>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              :class="p.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
            >
              {{ p.role }}
            </span>
          </button>
        </div>
      </div>
    </Card>
  </Container>
</template>
