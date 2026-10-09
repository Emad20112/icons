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
const { login, availableProfiles, selectProfile } = useAuth()
const { success, error } = useToast()

const email = ref('')
const isSubmitting = ref(false)

async function handleLogin() {
  if (!email.value) return
  isSubmitting.value = true
  try {
    await login(email.value)
    success('Authenticated', `Signed in as ${email.value}`)
    router.push('/')
  } catch (err: any) {
    error('Authentication Failed', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function quickSwitch(profileId: string) {
  await selectProfile(profileId)
  success('Profile Switched', 'Session profile loaded')
  router.push('/')
}
</script>

<template>
  <Container class="max-w-md py-12">
    <Card>
      <template #header>
        <div class="text-center">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">Sign In to Platform</h2>
          <p class="text-xs text-slate-500 mt-1">Supabase Auth Session Persistence</p>
        </div>
      </template>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
          <Input v-model="email" type="email" placeholder="name@example.com" required />
        </div>

        <Button type="submit" variant="primary" class="w-full" :loading="isSubmitting">
          Sign In
        </Button>

        <div class="text-center text-xs text-slate-500 pt-2">
          Don't have an account?
          <NuxtLink to="/auth/register" class="text-blue-600 font-semibold hover:underline">Sign Up</NuxtLink>
        </div>
      </form>

      <!-- Quick Session Switcher for Testing Acceptance Criteria -->
      <div v-if="availableProfiles.length > 0" class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <h4 class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Quick Test Accounts (Phase 0 Foundation)
        </h4>
        <div class="space-y-2">
          <button
            v-for="p in availableProfiles"
            :key="p.id"
            type="button"
            class="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
            @click="quickSwitch(p.id)"
          >
            <div>
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ p.display_name }}</div>
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
