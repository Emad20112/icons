<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import Badge from '../../components/ui/Badge.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { useAssets } from '../../composables/useAssets'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import type { Asset, AssetStatus } from '../../types/database'

definePageMeta({
  layout: 'admin'
})

const { assets, total, isLoading, fetchAssets, updateAsset, deleteAsset } = useAssets()
const { role, isAdmin } = useAuth()
const { success, error } = useToast()
const { t } = useI18n()

onMounted(() => {
  fetchAssets()
})

async function setStatus(asset: Asset, newStatus: AssetStatus) {
  try {
    await updateAsset(asset.id, { status: newStatus })
    success(t('toast.statusUpdated'), t('toast.statusUpdatedMessage', { status: newStatus }))
    fetchAssets()
  } catch (err: any) {
    error(t('adminAssets.actionFailed'), err.statusMessage || err.message)
  }
}

async function handleDelete(asset: Asset) {
  if (!confirm(t('adminAssets.confirmDelete', { name: asset.name }))) return

  try {
    await deleteAsset(asset.id)
    success(t('adminAssets.deleted'), t('adminAssets.deletedMessage', { name: asset.name }))
    fetchAssets()
  } catch (err: any) {
    error(t('adminAssets.deleteFailed'), err.statusMessage || err.message)
  }
}
</script>

<template>
  <Container>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ t('adminAssets.title') }}</h1>
        <p class="text-xs text-slate-500">{{ t('adminAssets.subtitle') }}</p>
      </div>
      <Button size="sm" variant="outline" @click="fetchAssets()">{{ t('adminAssets.refresh') }}</Button>
    </div>

    <LoadingState v-if="isLoading" />

    <EmptyState v-else-if="assets.length === 0" :title="t('adminAssets.empty')" />

    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
      <table class="w-full text-start text-xs text-slate-600 dark:text-slate-400">
        <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
          <tr>
            <th class="px-6 py-3 text-start">{{ t('adminAssets.table.asset') }}</th>
            <th class="px-6 py-3 text-start">{{ t('adminAssets.table.type') }}</th>
            <th class="px-6 py-3 text-start">{{ t('adminAssets.table.category') }}</th>
            <th class="px-6 py-3 text-start">{{ t('adminAssets.table.license') }}</th>
            <th class="px-6 py-3 text-start">{{ t('adminAssets.table.status') }}</th>
            <th class="px-6 py-3 text-end">{{ t('adminAssets.table.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="asset in assets" :key="asset.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
            <td class="px-6 py-4">
              <NuxtLink :to="`/assets/${asset.id}`" class="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600">
                {{ asset.name }}
              </NuxtLink>
              <div class="text-[10px] text-slate-400 font-mono">{{ asset.slug }}</div>
            </td>
            <td class="px-6 py-4 font-mono text-[11px] font-semibold">
              {{ asset.type }}
            </td>
            <td class="px-6 py-4">
              {{ asset.category?.name || t('adminAssets.uncategorized') }}
            </td>
            <td class="px-6 py-4">
              <span v-if="asset.license" class="text-slate-700 dark:text-slate-300">
                {{ asset.license.name }}
              </span>
              <span v-else class="text-amber-500 font-semibold">{{ t('adminAssets.noLicense') }}</span>
            </td>
            <td class="px-6 py-4">
              <Badge
                :variant="
                  asset.status === 'PUBLISHED' ? 'success' :
                  asset.status === 'DRAFT' ? 'secondary' :
                  asset.status === 'PENDING_REVIEW' ? 'warning' : 'destructive'
                "
              >
                {{ asset.status }}
              </Badge>
            </td>
            <td class="px-6 py-4 text-end whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5">
                <Button
                  v-if="asset.status !== 'PUBLISHED'"
                  size="sm"
                  variant="outline"
                  :disabled="!isAdmin || !asset.license_id"
                  @click="setStatus(asset, 'PUBLISHED')"
                >
                  {{ t('adminAssets.publish') }}
                </Button>
                <Button
                  v-if="asset.status !== 'ARCHIVED'"
                  size="sm"
                  variant="ghost"
                  :disabled="!isAdmin"
                  @click="setStatus(asset, 'ARCHIVED')"
                >
                  {{ t('adminAssets.archive') }}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  :disabled="!isAdmin"
                  @click="handleDelete(asset)"
                >
                  {{ t('adminAssets.delete') }}
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Container>
</template>
