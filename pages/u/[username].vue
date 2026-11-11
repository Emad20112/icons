<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { onMounted } from 'vue'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const username = route.params.username as string
  router.replace(`/@${username}`)
})
</script>

<template>
  <div class="p-12 text-center text-slate-400">
    جارٍ التحويل إلى الملف الشخصي...
  </div>
</template>
