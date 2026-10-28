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
const { register } = useAuth()
const { success, error } = useToast()
const { t } = useI18n()

const email = ref('')
const displayName = ref('')
const isSubmitting = ref(false)

async function handleRegister() {
  if (!email.value) return
  isSubmitting.value = true
  try {
    await register(email.value, displayName.value)
    success(t('auth.register.accountCreated'), t('auth.register.profileInitialized'))
    router.push('/')
  } catch (err: any) {
    error(t('auth.register.registrationFailed'), err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Container class="max-w-md py-12">
    <Card>
      <template #header>
        <div class="text-center">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ t('auth.register.title') }}</h2>
          <p class="text-xs text-slate-500 mt-1">{{ t('auth.register.subtitle') }}</p>
        </div>
      </template>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('auth.register.displayName') }}</label>
          <Input v-model="displayName" :placeholder="t('auth.register.displayNamePlaceholder')" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('auth.register.email') }}</label>
          <Input v-model="email" type="email" :placeholder="t('auth.register.emailPlaceholder')" required />
        </div>

        <Button type="submit" variant="primary" class="w-full" :loading="isSubmitting">
          {{ t('auth.register.submit') }}
        </Button>

        <div class="text-center text-xs text-slate-500 pt-2">
          {{ t('auth.register.hasAccount') }}
          <NuxtLink to="/auth/login" class="text-blue-600 font-semibold hover:underline">{{ t('auth.register.signIn') }}</NuxtLink>
        </div>
      </form>
    </Card>
  </Container>
</template>
