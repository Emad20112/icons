<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Card from '../../components/ui/Card.vue'
import Button from '../../components/ui/Button.vue'
import Input from '../../components/ui/Input.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const { register, loginWithGoogle, checkUsernameAvailability } = useAuth()
const { success, error } = useToast()
const { t } = useI18n()

const email = ref('')
const displayName = ref('')
const username = ref('')
const password = ref('')
const isUsernameAvailable = ref<boolean | null>(null)
const isCheckingUsername = ref(false)
const isSubmitting = ref(false)
const isGoogleSubmitting = ref(false)

let debounceTimer: any = null
watch(username, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const clean = val.trim().toLowerCase()
  if (!clean || clean.length < 3) {
    isUsernameAvailable.value = null
    return
  }
  isCheckingUsername.value = true
  debounceTimer = setTimeout(async () => {
    isUsernameAvailable.value = await checkUsernameAvailability(clean)
    isCheckingUsername.value = false
  }, 300)
})

async function handleRegister() {
  if (!email.value) return
  if (isUsernameAvailable.value === false) {
    error('اسم المستخدم غير متاح', 'يرجى اختيار اسم مستخدم فريد ومختلف.')
    return
  }
  isSubmitting.value = true
  try {
    const user = await register(email.value, displayName.value || undefined, username.value || undefined, password.value || undefined)
    success(t('auth.register.accountCreated') || 'تم إنشاء الحساب بنجاح', `مرحباً بك @${user.username}`)
    router.push('/dashboard')
  } catch (err: any) {
    error(t('auth.register.registrationFailed') || 'فشل التسجيل', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleRegister() {
  isGoogleSubmitting.value = true
  try {
    const user = await loginWithGoogle()
    success('تم إنشاء الحساب عبر Google', `اسم المستخدم الخاص بك: @${user.username}`)
    router.push('/dashboard')
  } catch (err: any) {
    error('فشل التسجيل بـ Google', err.statusMessage || err.message)
  } finally {
    isGoogleSubmitting.value = false
  }
}
</script>

<template>
  <Container class="max-w-md py-12">
    <Card>
      <template #header>
        <div class="text-center">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ t('auth.register.title') || 'إنشاء حساب جديد' }}</h2>
          <p class="text-xs text-slate-500 mt-1">{{ t('auth.register.subtitle') || 'اختر اسم مستخدم فريداً وابدأ تنظيم مستودعات الخطوط والأيقونات' }}</p>
        </div>
      </template>

      <!-- Google Fast Sign Up -->
      <div class="mb-4">
        <button
          type="button"
          @click="handleGoogleRegister"
          :disabled="isGoogleSubmitting"
          class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm disabled:opacity-50"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{{ isGoogleSubmitting ? 'جارٍ الاتصال...' : 'التسجيل السريع باستخدام Google' }}</span>
        </button>

        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
          <div class="relative flex justify-center text-xs uppercase"><span class="bg-white dark:bg-slate-900 px-2 text-slate-400">أو بالبيانات</span></div>
        </div>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('auth.register.displayName') || 'الاسم الظاهر' }}</label>
          <Input v-model="displayName" placeholder="مثال: يونس خالد" required />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">اسم المستخدم الفريد (Username)</label>
            <span v-if="isCheckingUsername" class="text-[10px] text-slate-400">جارٍ التحقق...</span>
            <span v-else-if="isUsernameAvailable === true" class="text-[10px] text-emerald-600 font-bold">✓ متاح</span>
            <span v-else-if="isUsernameAvailable === false" class="text-[10px] text-red-600 font-bold">✗ غير متاح</span>
          </div>
          <div class="relative">
            <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 text-xs font-mono">@</span>
            <input
              v-model="username"
              type="text"
              placeholder="yunis_designer"
              required
              class="w-full ps-7 pe-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <p class="text-[10px] text-slate-400 mt-1">سيكون رابط صفحتك العامة: <span class="font-mono text-blue-600">/@{{ username || 'username' }}</span></p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('auth.register.email') || 'البريد الإلكتروني' }}</label>
          <Input v-model="email" type="email" placeholder="example@mail.com" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
          <Input v-model="password" type="password" placeholder="••••••••" required />
        </div>

        <Button type="submit" variant="primary" class="w-full" :loading="isSubmitting">
          {{ t('auth.register.submit') || 'إنشاء الحساب' }}
        </Button>

        <div class="text-center text-xs text-slate-500 pt-2">
          {{ t('auth.register.hasAccount') || 'لديك حساب بالفعل؟' }}
          <NuxtLink to="/auth/login" class="text-blue-600 font-semibold hover:underline">{{ t('auth.register.signIn') || 'تسجيل الدخول' }}</NuxtLink>
        </div>
      </form>
    </Card>
  </Container>
</template>
