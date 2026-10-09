<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import Badge from '../../components/ui/Badge.vue'
import Card from '../../components/ui/Card.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import ErrorState from '../../components/common/ErrorState.vue'
import AssetCard from '../../components/assets/AssetCard.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { useAssets } from '../../composables/useAssets'
import type { Asset, AssetStatus } from '../../types/database'

const route = useRoute()
const router = useRouter()
const { role, isAdmin } = useAuth()
const { success, error } = useToast()
const { getRelatedAssets } = useAssets()

const asset = ref<Asset | null>(null)
const relatedAssets = ref<Asset[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const isUpdatingStatus = ref(false)

async function loadAssetData(id: string) {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ success: boolean; data: Asset }>(`/api/v1/assets/${id}`, {
      headers: { 'x-user-role': role.value }
    })
    if (res.success) {
      asset.value = res.data
      // Fetch related icons sharing tags or category
      try {
        const relatedRes = await getRelatedAssets(id, 8)
        if (relatedRes?.data) {
          relatedAssets.value = relatedRes.data
        }
      } catch (rErr) {
        console.warn('Could not load related assets:', rErr)
      }
    }
  } catch (err: any) {
    errorMessage.value = err.statusMessage || err.message || 'Asset not found or restricted by RLS'
  } finally {
    isLoading.value = false
  }
}

async function handleStatusChange(newStatus: AssetStatus) {
  if (!asset.value) return
  isUpdatingStatus.value = true
  try {
    const res = await $fetch<{ success: boolean; data: Asset }>(`/api/v1/assets/${asset.value.id}`, {
      method: 'PATCH',
      body: { status: newStatus },
      headers: { 'x-user-role': role.value }
    })
    if (res.success) {
      asset.value = res.data
      success('Status Updated', `Asset transitioned to ${newStatus}`)
    }
  } catch (err: any) {
    error('Update Failed', err.statusMessage || err.message)
  } finally {
    isUpdatingStatus.value = false
  }
}

onMounted(() => {
  loadAssetData(route.params.id as string)
})

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadAssetData(newId as string)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }
)
</script>

<template>
  <Container>
    <div class="mb-4">
      <NuxtLink to="/" class="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        &larr; Back to Assets Catalog
      </NuxtLink>
    </div>

    <LoadingState v-if="isLoading" />

    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <h3 class="text-sm font-semibold">Access Restricted</h3>
      <p class="text-xs mt-1">{{ errorMessage }}</p>
      <NuxtLink to="/" class="mt-4 inline-block">
        <Button size="sm" variant="outline">Return Home</Button>
      </NuxtLink>
    </div>

    <div v-else-if="asset" class="space-y-12">
      <!-- Main Asset Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Left: Asset Visual & Files -->
        <div class="md:col-span-2 space-y-6">
          <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {{ asset.type }}
                </span>
                <Badge :variant="asset.status === 'PUBLISHED' ? 'success' : 'secondary'">
                  {{ asset.status }}
                </Badge>
                <Badge v-if="asset.is_featured" variant="warning">
                  ★ Featured
                </Badge>
              </div>
              <span class="text-xs text-slate-400 font-mono">slug: {{ asset.slug }}</span>
            </div>

            <!-- Preview Stage -->
            <div class="flex h-64 w-full items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/60 p-8 border border-slate-100 dark:border-slate-800">
              <div
                v-if="asset.files?.[0]?.metadata?.rawContent"
                class="h-32 w-32 text-slate-900 dark:text-white"
                v-html="asset.files[0].metadata.rawContent"
              />
              <div v-else-if="asset.type === 'FONT'" class="text-6xl font-serif text-slate-800 dark:text-slate-100 font-bold">
                Aa Gg Qq
              </div>
              <div v-else class="text-4xl font-bold text-slate-400">
                {{ asset.name.charAt(0) }}
              </div>
            </div>

            <!-- Name, Description, and Tags -->
            <div class="mt-6 space-y-3">
              <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ asset.name }}</h1>
              <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {{ asset.description || 'No description provided for this digital asset.' }}
              </p>

              <!-- Tags for Discovery Filtering -->
              <div v-if="asset.tags && asset.tags.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2">
                <NuxtLink
                  v-for="t in asset.tags"
                  :key="t.id"
                  :to="`/?tag=${t.slug}`"
                  class="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950 transition-colors"
                >
                  #{{ t.name }}
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Files & Storage Manifest -->
          <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Storage Files Manifest (Supabase Storage)
            </h3>
            <p class="text-xs text-slate-500 mb-4">
              Binary files decoupled from PostgreSQL metadata. Paths are partitioned logically.
            </p>

            <div v-if="!asset.files || asset.files.length === 0" class="text-xs text-slate-400 py-3">
              No binary file attached to this draft yet.
            </div>

            <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
              <div
                v-for="file in asset.files"
                :key="file.id"
                class="flex items-center justify-between py-3"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">{{ file.format }}</span>
                    <span class="text-[11px] text-slate-400">{{ (file.file_size / 1024).toFixed(1) }} KB</span>
                    <span class="text-[11px] text-slate-400">• {{ file.mime_type }}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-md">
                    {{ file.file_path }}
                  </div>
                </div>

                <a
                  :href="file.metadata?.fullUrl || '#'"
                  target="_blank"
                  download
                  class="inline-flex items-center"
                >
                  <Button size="sm" variant="outline">
                    Download {{ file.format }}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Metadata & Governance Sidebar -->
        <div class="space-y-6">
          <!-- License Card -->
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              License & Terms
            </h3>

            <div v-if="asset.license" class="space-y-3 text-xs">
              <div class="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {{ asset.license.name }}
              </div>
              <div class="flex flex-col gap-1.5 text-slate-600 dark:text-slate-400">
                <div class="flex items-center justify-between">
                  <span>Commercial Use:</span>
                  <span class="font-semibold" :class="asset.license.commercial_use ? 'text-emerald-600' : 'text-red-500'">
                    {{ asset.license.commercial_use ? 'Allowed' : 'Prohibited' }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Standalone Resale:</span>
                  <span class="font-semibold" :class="asset.license.redistribution ? 'text-emerald-600' : 'text-slate-500'">
                    {{ asset.license.redistribution ? 'Allowed' : 'Prohibited' }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Attribution:</span>
                  <span class="font-semibold">
                    {{ asset.license.attribution_required ? 'Required' : 'Not Required' }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-amber-600 font-medium">
              Warning: Draft currently lacks an assigned license. Cannot be published without one.
            </div>
          </div>

          <!-- Taxonomy & Author -->
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
            <div>
              <span class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1">Category</span>
              <NuxtLink
                v-if="asset.category"
                :to="`/?category=${asset.category.slug}`"
                class="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {{ asset.category.name }}
              </NuxtLink>
              <span v-else class="font-medium text-slate-800 dark:text-slate-200">Uncategorized</span>
            </div>

            <div>
              <span class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1">Author / Contributor</span>
              <span class="font-medium text-slate-800 dark:text-slate-200">
                {{ asset.author?.display_name || asset.author?.email || asset.author_id }}
              </span>
            </div>

            <div>
              <span class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1">Downloads</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {{ asset.download_count }}
              </span>
            </div>

            <div>
              <span class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1">Created At</span>
              <span class="text-slate-600 dark:text-slate-400 font-mono">
                {{ new Date(asset.created_at).toLocaleDateString() }}
              </span>
            </div>
          </div>

          <!-- Admin Lifecycle Control -->
          <div v-if="isAdmin" class="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/30 space-y-3">
            <h4 class="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              Admin Lifecycle Moderation
            </h4>
            <p class="text-[11px] text-slate-600 dark:text-slate-400">
              Admins govern asset lifecycle states through server-side authorization.
            </p>

            <div class="flex flex-col gap-2 pt-2">
              <Button
                v-if="asset.status !== 'PUBLISHED'"
                size="sm"
                variant="primary"
                :disabled="!asset.license_id || isUpdatingStatus"
                @click="handleStatusChange('PUBLISHED')"
              >
                Publish Asset (Public Read)
              </Button>
              <Button
                v-if="asset.status !== 'ARCHIVED'"
                size="sm"
                variant="outline"
                :disabled="isUpdatingStatus"
                @click="handleStatusChange('ARCHIVED')"
              >
                Archive Asset
              </Button>
              <Button
                v-if="asset.status !== 'DRAFT'"
                size="sm"
                variant="ghost"
                :disabled="isUpdatingStatus"
                @click="handleStatusChange('DRAFT')"
              >
                Revert to Draft
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Icons Section (Discovery Feature) -->
      <div v-if="relatedAssets.length > 0" class="pt-6 border-t border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
              Related Icons & Similar Assets
            </h3>
            <p class="text-xs text-slate-500">
              Icons sharing related tags, taxonomy category, or search keywords.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AssetCard
            v-for="rel in relatedAssets"
            :key="rel.id"
            :asset="rel"
            @select="router.push(`/assets/${rel.id}`)"
          />
        </div>
      </div>
    </div>
  </Container>
</template>
