<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SelectedIconDetails } from '../../composables/useIconify'
import { useAuth } from '../../composables/useAuth'
import { useRepositories } from '../../composables/useRepositories'
import { useI18n } from '#imports'
import { X, Copy, Check, Code2, Download, PenTool, FolderPlus, Lock, Globe } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  icon: SelectedIconDetails | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download', prefix: string, name: string, color: string, size: number): void
}>()

const router = useRouter()
const { t } = useI18n()
const { user } = useAuth()
const { repositories, fetchRepositories, createRepository } = useRepositories()

const currentColor = ref('currentColor')
const currentSize = ref(48)
const copiedIdentifier = ref(false)
const copiedSvg = ref(false)

const selectedRepoId = ref('')
const isSaving = ref(false)
const saveMessage = ref<string | null>(null)
const saveStatus = ref<'success' | 'error'>('success')

// Quick inline repository creator
const showNewRepoForm = ref(false)
const newRepoName = ref('')
const newRepoVisibility = ref<'PRIVATE' | 'PUBLIC'>('PRIVATE')
const isCreatingRepo = ref(false)

const userRepositories = computed(() => repositories.value || [])

watch(() => props.isOpen, async (open) => {
  if (open && user.value) {
    await fetchRepositories({ ownerId: user.value.id })
    if (!selectedRepoId.value && repositories.value.length > 0) {
      selectedRepoId.value = repositories.value[0].id
    }
  }
  saveMessage.value = null
  showNewRepoForm.value = false
})

const colorOptions = [
  { value: 'currentColor', preview: '#64748b' },
  { value: '#0f172a', preview: '#0f172a' },
  { value: '#2563eb', preview: '#2563eb' },
  { value: '#16a34a', preview: '#16a34a' },
  { value: '#dc2626', preview: '#dc2626' },
  { value: '#9333ea', preview: '#9333ea' },
  { value: '#ea580c', preview: '#ea580c' },
]

const customizedSvgCode = computed(() => {
  if (!props.icon?.svgCode) return ''
  let code = props.icon.svgCode
  if (currentColor.value !== 'currentColor') {
    if (/<svg[^>]*\scolor=/.test(code)) {
      code = code.replace(/color="[^"]*"/, `color="${currentColor.value}"`)
    } else {
      code = code.replace(/<svg\b([^>]*)>/, `<svg$1 color="${currentColor.value}">`)
    }
  }
  return code
})

async function copyIdentifier() {
  if (!props.icon) return
  await navigator.clipboard.writeText(props.icon.fullName)
  copiedIdentifier.value = true
  setTimeout(() => { copiedIdentifier.value = false }, 1800)
}

async function copySvgMarkup() {
  if (!props.icon?.svgCode) return
  await navigator.clipboard.writeText(customizedSvgCode.value || props.icon.svgCode)
  copiedSvg.value = true
  setTimeout(() => { copiedSvg.value = false }, 1800)
}

function triggerDownload() {
  if (!props.icon) return
  emit('download', props.icon.prefix, props.icon.name, currentColor.value, currentSize.value)
}

function openInEditor() {
  if (!props.icon?.svgCode) return
  const svgToTransfer = customizedSvgCode.value || props.icon.svgCode
  sessionStorage.setItem('pending_editor_svg', svgToTransfer)
  sessionStorage.setItem('pending_editor_title', props.icon.fullName)
  emit('close')
  router.push('/tools/icon-editor')
}

async function saveIconToRepository(targetRepoId?: string) {
  const repoId = targetRepoId || selectedRepoId.value
  if (!props.icon || !repoId) return
  const svgData = customizedSvgCode.value || props.icon.svgCode
  if (!svgData) return

  isSaving.value = true
  saveMessage.value = null

  try {
    const res = await $fetch<{ success: boolean }>('/api/v1/iconify/save', {
      method: 'POST',
      body: {
        prefix: props.icon.prefix,
        name: props.icon.name,
        svg: svgData,
        repositoryId: repoId
      }
    })

    if (res.success) {
      saveStatus.value = 'success'
      saveMessage.value = t('iconify.save_success')
      setTimeout(() => { saveMessage.value = null }, 3000)
    }
  } catch (err: any) {
    saveStatus.value = 'error'
    saveMessage.value = err?.data?.statusMessage || err?.message || t('iconify.save_failed')
  } finally {
    isSaving.value = false
  }
}

async function createRepoAndSave() {
  if (!newRepoName.value.trim()) return
  isCreatingRepo.value = true
  saveMessage.value = null
  try {
    const created = await createRepository({
      name: newRepoName.value.trim(),
      visibility: newRepoVisibility.value,
      allow_download: true
    })
    if (created?.id) {
      selectedRepoId.value = created.id
      newRepoName.value = ''
      showNewRepoForm.value = false
      await saveIconToRepository(created.id)
    }
  } catch (err: any) {
    saveStatus.value = 'error'
    saveMessage.value = err?.data?.statusMessage || err?.message || t('iconify.save_failed')
  } finally {
    isCreatingRepo.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen && icon"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    @click.self="$emit('close')"
  >
    <div class="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <div class="min-w-0">
          <div class="text-[11px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {{ icon.prefix }}
          </div>
          <h3 class="truncate text-lg font-bold text-slate-900 dark:text-white">
            {{ icon.name }}
          </h3>
        </div>
        <button
          type="button"
          :aria-label="t('iconify.close')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">
        <!-- SVG Preview Stage -->
        <div class="flex h-44 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          <div
            v-if="icon.svgCode"
            v-html="customizedSvgCode"
            class="flex items-center justify-center transition-all [&>svg]:w-full [&>svg]:h-full"
            :style="{
              width: `${Math.min(currentSize * 1.4, 128)}px`,
              height: `${Math.min(currentSize * 1.4, 128)}px`,
              color: currentColor === 'currentColor' ? undefined : currentColor
            }"
          />
          <div v-else class="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>

        <!-- Color & Size Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ t('iconify.color') }}
            </label>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="c in colorOptions"
                :key="c.value"
                type="button"
                class="h-7 w-7 rounded-full border-2 transition-transform"
                :class="currentColor === c.value ? 'scale-110 border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 dark:border-slate-700'"
                :style="{ backgroundColor: c.preview }"
                @click="currentColor = c.value"
              />
              <input
                type="color"
                :value="currentColor.startsWith('#') ? currentColor : '#2563eb'"
                class="h-7 w-7 cursor-pointer rounded-full border border-slate-300 bg-transparent p-0 dark:border-slate-700"
                @input="currentColor = ($event.target as HTMLInputElement).value"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ t('iconify.size') }}: <span class="font-mono">{{ currentSize }}px</span>
            </label>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="s in [16, 24, 32, 48, 64]"
                :key="s"
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-colors"
                :class="currentSize === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
                @click="currentSize = s"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </div>

        <!-- Primary Export Actions -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            @click="copyIdentifier"
          >
            <Check v-if="copiedIdentifier" class="h-4 w-4 text-emerald-600" />
            <Copy v-else class="h-4 w-4 text-slate-400" />
            <span>{{ copiedIdentifier ? t('iconify.copied') : t('iconify.copy_identifier') }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            @click="copySvgMarkup"
          >
            <Check v-if="copiedSvg" class="h-4 w-4 text-emerald-600" />
            <Code2 v-else class="h-4 w-4 text-slate-400" />
            <span>{{ copiedSvg ? t('iconify.copied') : t('iconify.copy_svg') }}</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            @click="triggerDownload"
          >
            <Download class="h-4 w-4" />
            <span>{{ t('iconify.download_svg') }}</span>
          </button>
        </div>

        <!-- Editor & Save to Repository -->
        <div class="border-t border-slate-100 pt-4 dark:border-slate-800 space-y-3">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950 transition-colors"
              @click="openInEditor"
            >
              <PenTool class="h-4 w-4" />
              <span>{{ t('iconify.open_in_editor') }}</span>
            </button>

            <div v-if="user" class="flex flex-1 items-center gap-1.5">
              <select
                v-model="selectedRepoId"
                class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="">{{ t('iconify.select_repository') }}</option>
                <option v-for="repo in userRepositories" :key="repo.id" :value="repo.id">
                  {{ repo.name }}
                </option>
              </select>

              <button
                type="button"
                :title="t('iconify.new_repo')"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                @click="showNewRepoForm = !showNewRepoForm"
              >
                <FolderPlus class="h-4 w-4" />
              </button>

              <button
                type="button"
                :disabled="isSaving || !selectedRepoId"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white whitespace-nowrap transition-colors"
                @click="saveIconToRepository()"
              >
                <span v-if="isSaving" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>{{ isSaving ? t('iconify.saving') : t('iconify.save_to_repository') }}</span>
              </button>
            </div>

            <NuxtLink
              v-else
              to="/auth/login"
              class="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              @click="$emit('close')"
            >
              {{ t('iconify.sign_in_to_save') }}
            </NuxtLink>
          </div>

          <!-- Inline New Repo Quick-Create -->
          <div
            v-if="user && showNewRepoForm"
            class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
          >
            <input
              v-model="newRepoName"
              type="text"
              :placeholder="t('iconify.repo_name_placeholder')"
              class="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              @click="newRepoVisibility = newRepoVisibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'"
            >
              <Lock v-if="newRepoVisibility === 'PRIVATE'" class="h-3.5 w-3.5 text-amber-600" />
              <Globe v-else class="h-3.5 w-3.5 text-emerald-600" />
              <span>{{ newRepoVisibility === 'PRIVATE' ? t('iconify.private_repo') : t('iconify.public_repo') }}</span>
            </button>
            <button
              type="button"
              :disabled="isCreatingRepo || !newRepoName.trim()"
              class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              @click="createRepoAndSave"
            >
              {{ t('iconify.create_and_save') }}
            </button>
          </div>

          <!-- Save Feedback -->
          <div
            v-if="saveMessage"
            class="flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium"
            :class="saveStatus === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'"
          >
            <span>{{ saveMessage }}</span>
            <button type="button" class="opacity-75 hover:opacity-100" @click="saveMessage = null">&times;</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
