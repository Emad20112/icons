<script setup lang="ts">
import { ref } from 'vue'
import type { License } from '../../types/database'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import Badge from '../ui/Badge.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'

defineProps<{
  licenses: License[]
}>()

const emit = defineEmits<{
  (e: 'licenseCreated'): void
}>()

const { isAdmin, role } = useAuth()
const { success, error } = useToast()

const name = ref('')
const url = ref('')
const commercialUse = ref(true)
const redistribution = ref(false)
const modification = ref(true)
const attributionRequired = ref(true)
const isSubmitting = ref(false)

async function handleCreate() {
  if (!name.value.trim()) return

  isSubmitting.value = true
  try {
    await $fetch('/api/v1/licenses', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        url: url.value.trim() || undefined,
        commercial_use: commercialUse.value,
        redistribution: redistribution.value,
        modification: modification.value,
        attribution_required: attributionRequired.value
      },
      headers: {
        'x-user-role': role.value
      }
    })
    success('License Created', `License "${name.value}" registered successfully`)
    name.value = ''
    url.value = ''
    emit('licenseCreated')
  } catch (err: any) {
    error('Creation Failed', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Legal Licensing Engine</h3>
        <p class="text-xs text-slate-500">Every published asset requires an explicit, verified digital asset license.</p>
      </div>
    </div>

    <!-- Create Form -->
    <form v-if="isAdmin" @submit.prevent="handleCreate" class="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="name" placeholder="License Name (e.g. Apache 2.0)" required />
        <Input v-model="url" placeholder="https://opensource.org/licenses/..." />
      </div>

      <div class="flex flex-wrap items-center gap-5 text-xs text-slate-700 dark:text-slate-300">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" v-model="commercialUse" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>Commercial Use</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" v-model="redistribution" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>Standalone Redistribution</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" v-model="modification" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>Derivatives / Modification</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" v-model="attributionRequired" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>Attribution Required</span>
        </label>
      </div>

      <div class="flex justify-end pt-2">
        <Button size="sm" type="submit" :loading="isSubmitting">
          Add Legal License
        </Button>
      </div>
    </form>
    <div v-else class="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs dark:bg-amber-950 dark:text-amber-200">
      Viewing as standard USER. License management requires the ADMIN role.
    </div>

    <!-- Licenses Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      <div
        v-for="lic in licenses"
        :key="lic.id"
        class="flex flex-col p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
      >
        <div class="flex items-baseline justify-between mb-2">
          <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">{{ lic.name }}</span>
          <span class="text-[10px] text-slate-400 font-mono">{{ lic.slug }}</span>
        </div>

        <div class="flex flex-wrap gap-1.5 mt-auto pt-2">
          <Badge :variant="lic.commercial_use ? 'success' : 'destructive'">
            {{ lic.commercial_use ? 'Commercial' : 'Non-Commercial' }}
          </Badge>
          <Badge :variant="lic.redistribution ? 'default' : 'secondary'">
            {{ lic.redistribution ? 'Redistribution: Allowed' : 'No Resale' }}
          </Badge>
          <Badge :variant="lic.attribution_required ? 'warning' : 'outline'">
            {{ lic.attribution_required ? 'Attribution Req.' : 'No Attribution' }}
          </Badge>
        </div>
      </div>
    </div>
  </div>
</template>
