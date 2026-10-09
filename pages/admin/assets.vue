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

onMounted(() => {
  fetchAssets()
})

async function setStatus(asset: Asset, newStatus: AssetStatus) {
  try {
    await updateAsset(asset.id, { status: newStatus })
    success('Status Updated', `${asset.name} transitioned to ${newStatus}`)
    fetchAssets()
  } catch (err: any) {
    error('Action Failed', err.statusMessage || err.message)
  }
}

async function handleDelete(asset: Asset) {
  if (!confirm(`Are you sure you want to delete asset "${asset.name}"?`)) return

  try {
    await deleteAsset(asset.id)
    success('Asset Deleted', `${asset.name} removed`)
    fetchAssets()
  } catch (err: any) {
    error('Delete Failed', err.statusMessage || err.message)
  }
}
</script>

<template>
  <Container>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Asset Moderation & Lifecycle</h1>
        <p class="text-xs text-slate-500">Manage drafts, pending reviews, published assets, and archives.</p>
      </div>
      <Button size="sm" variant="outline" @click="fetchAssets()">Refresh</Button>
    </div>

    <LoadingState v-if="isLoading" />

    <EmptyState v-else-if="assets.length === 0" title="No assets found" />

    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
      <table class="w-full text-left text-xs text-slate-600 dark:text-slate-400">
        <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
          <tr>
            <th class="px-6 py-3">Asset</th>
            <th class="px-6 py-3">Type</th>
            <th class="px-6 py-3">Category</th>
            <th class="px-6 py-3">License</th>
            <th class="px-6 py-3">Status</th>
            <th class="px-6 py-3 text-right">Lifecycle Actions</th>
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
              {{ asset.category?.name || 'Uncategorized' }}
            </td>
            <td class="px-6 py-4">
              <span v-if="asset.license" class="text-slate-700 dark:text-slate-300">
                {{ asset.license.name }}
              </span>
              <span v-else class="text-amber-500 font-semibold">None</span>
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
            <td class="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
              <Button
                v-if="asset.status !== 'PUBLISHED'"
                size="sm"
                variant="outline"
                :disabled="!isAdmin || !asset.license_id"
                @click="setStatus(asset, 'PUBLISHED')"
              >
                Publish
              </Button>
              <Button
                v-if="asset.status !== 'ARCHIVED'"
                size="sm"
                variant="ghost"
                :disabled="!isAdmin"
                @click="setStatus(asset, 'ARCHIVED')"
              >
                Archive
              </Button>
              <Button
                size="sm"
                variant="destructive"
                :disabled="!isAdmin"
                @click="handleDelete(asset)"
              >
                Delete
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Container>
</template>
