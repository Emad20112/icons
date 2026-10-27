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
const { t } = useI18n()

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
    errorMessage.value = t('assetForm.errorNameRequired')
    return
  }

  // Business Rule Validation: Published assets require license
  if (status.value === 'PUBLISHED' && !licenseId.value) {
    errorMessage.value = t('assetForm.errorLicenseRequired')
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
    errorMessage.value = err.statusMessage || err.message || t('assetForm.errorCreateFailed')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Modal :open="open" :title="t('assetForm.title')" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="errorMessage" class="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
        {{ errorMessage }}
      </div>

      <!-- Asset Name -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('assetForm.name') }}</label>
        <Input v-model="name" :placeholder="t('assetForm.namePlaceholder')" required />
      </div>

      <!-- Asset Type -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('assetForm.assetType') }}</label>
        <select
          v-model="type"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="ICON">{{ t('filters.types.icon') }}</option>
          <option value="FONT">{{ t('filters.types.font') }}</option>
          <option value="ILLUSTRATION">{{ t('filters.types.illustration') }}</option>
          <option value="LOGO">{{ t('filters.types.logo') }}</option>
          <option value="TEMPLATE">{{ t('filters.types.template') }}</option>
        </select>
      </div>

      <!-- Category -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('assetForm.category') }}</label>
        <select
          v-model="categoryId"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">{{ t('assetForm.selectCategory') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- License -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {{ t('assetForm.license') }} {{ status === 'PUBLISHED' ? t('assetForm.licenseRequired') : t('assetForm.licenseOptional') }}
        </label>
        <select
          v-model="licenseId"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">{{ t('assetForm.selectLicense') }}</option>
          <option v-for="lic in licenses" :key="lic.id" :value="lic.id">
            {{ lic.name }} ({{ lic.commercial_use ? t('filters.licenseUsage.commercial') : t('filters.licenseUsage.personal') }})
          </option>
        </select>
      </div>

      <!-- Status & Permissions Notice -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('assetForm.status') }}</label>
        <select
          v-model="status"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="DRAFT">{{ t('assetForm.statusDraft') }}</option>
          <option value="PENDING_REVIEW">{{ t('assetForm.statusPendingReview') }}</option>
          <option value="PUBLISHED" :disabled="!isAdmin">
            {{ t('assetForm.statusPublished', { scope: isAdmin ? t('assetForm.statusPublishedAdmin') : t('assetForm.statusPublishedUser') }) }}
          </option>
        </select>
        <p v-if="!isAdmin && status === 'DRAFT'" class="text-[11px] text-slate-500 mt-1">
          {{ t('assetForm.draftNotice') }}
        </p>
      </div>

      <!-- Optional Raw SVG Payload -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {{ t('assetForm.svgLabel') }}
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
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ t('assetForm.description') }}</label>
        <textarea
          v-model="description"
          rows="2"
          :placeholder="t('assetForm.descriptionPlaceholder')"
          class="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" type="button" @click="emit('close')">{{ t('assetForm.cancel') }}</Button>
        <Button variant="primary" type="submit" :loading="isSubmitting">
          {{ t('assetForm.submit') }}
        </Button>
      </div>
    </form>
  </Modal>
</template>
