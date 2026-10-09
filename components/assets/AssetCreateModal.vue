<script setup lang="ts">
import { ref } from 'vue'
import type { Category, License, AssetType, AssetStatus } from '../../types/database'
import Modal from '../ui/Modal.vue'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import { useAuth } from '../../composables/useAuth'

const props = defineProps<{
  open: boolean
  categories: Category[]
  licenses: License[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const { isAdmin, role } = useAuth()

const name = ref('')
const type = ref<AssetType>('ICON')
const description = ref('')
const categoryId = ref('')
const licenseId = ref('')
const status = ref<AssetStatus>('DRAFT')
const isFeatured = ref(false)
const svgContent = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

async function handleSubmit() {
  errorMessage.value = null
  if (!name.value.trim()) {
    errorMessage.value = 'Asset name is required'
    return
  }

  // Business Rule Validation: Published assets require license
  if (status.value === 'PUBLISHED' && !licenseId.value) {
    errorMessage.value = 'A license is strictly required for Published assets'
    return
  }

  isSubmitting.value = true
  try {
    // 1. Create Asset
    const res = await $fetch<{ success: boolean; data: any }>('/api/v1/assets', {
      method: 'POST',
      body: {
        name: name.value,
        type: type.value,
        description: description.value || null,
        category_id: categoryId.value || null,
        license_id: licenseId.value || null,
        status: status.value,
        is_featured: isFeatured.value,
      },
      headers: {
        'x-user-role': role.value
      }
    })

    // 2. If SVG file content provided, upload through storage service!
    if (res.success && svgContent.value.trim()) {
      await $fetch('/api/v1/storage/upload', {
        method: 'POST',
        body: {
          asset_id: res.data.id,
          format: 'SVG',
          file_name: `${res.data.slug}.svg`,
          file_size: svgContent.value.length,
          mime_type: 'image/svg+xml',
          content: svgContent.value.trim()
        },
        headers: {
          'x-user-role': role.value
        }
      })
    }

    // Reset form
    name.value = ''
    description.value = ''
    svgContent.value = ''
    status.value = 'DRAFT'
    emit('created')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err.statusMessage || err.message || 'Failed to create asset'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="Create New Digital Asset" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="errorMessage" class="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
        {{ errorMessage }}
      </div>

      <!-- Asset Name -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Name *</label>
        <Input v-model="name" placeholder="e.g. Modern Secure Shield" required />
      </div>

      <!-- Asset Type -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Asset Type</label>
        <select
          v-model="type"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="ICON">Icon (Vector)</option>
          <option value="FONT">Font (Typography)</option>
          <option value="ILLUSTRATION">Illustration (Scene)</option>
          <option value="LOGO">Logo (Brand)</option>
          <option value="TEMPLATE">Template (Design System)</option>
        </select>
      </div>

      <!-- Category -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
        <select
          v-model="categoryId"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Select a Category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- License -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          License {{ status === 'PUBLISHED' ? '(Mandatory for Published Assets) *' : '(Optional for Drafts)' }}
        </label>
        <select
          v-model="licenseId"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Select a License</option>
          <option v-for="lic in licenses" :key="lic.id" :value="lic.id">
            {{ lic.name }} ({{ lic.commercial_use ? 'Commercial' : 'Personal' }})
          </option>
        </select>
      </div>

      <!-- Status & Permissions Notice -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Lifecycle</label>
        <select
          v-model="status"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="DRAFT">DRAFT (Author only)</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW (Awaiting approval)</option>
          <option value="PUBLISHED" :disabled="!isAdmin">
            PUBLISHED (Public - {{ isAdmin ? 'Admin allowed' : 'Admin only' }})
          </option>
        </select>
        <p v-if="!isAdmin && status === 'DRAFT'" class="text-[11px] text-slate-500 mt-1">
          As a regular user, RLS allows saving in DRAFT or PENDING_REVIEW status. Admins moderate and publish.
        </p>
      </div>

      <!-- Optional Raw SVG Payload -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Vector SVG Code (Optional - Automatically sanitized against XSS)
        </label>
        <textarea
          v-model="svgContent"
          rows="3"
          placeholder='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="..."/></svg>'
          class="w-full rounded-md border border-slate-300 p-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        ></textarea>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
        <textarea
          v-model="description"
          rows="2"
          placeholder="Brief description of asset usage and characteristics..."
          class="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" type="button" @click="emit('close')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="isSubmitting">
          Save Asset & Metadata
        </Button>
      </div>
    </form>
  </Modal>
</template>
