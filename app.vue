<script setup lang="ts">
// Localized document attributes (lang/dir), hreflang alternates and og:locale.
// The negotiated locale is resolved server-side from the cookie, so `dir`
// is already correct before the first paint.
import { SUPPORTED_LOCALES, getDirection } from '~/i18n/locales'
import { useTheme } from '~/composables/useTheme'
import { onMounted } from 'vue'

const { locale } = useI18n()
const head = useLocaleHead({ seo: true })
const { isDark, initTheme } = useTheme()

onMounted(() => {
  initTheme()
})

const currentDir = computed(() => head.value?.htmlAttrs?.dir || getDirection(locale.value))
const currentLang = computed(() => head.value?.htmlAttrs?.lang || (locale.value === 'ar' ? 'ar-SA' : 'en-US'))

const config = useRuntimeConfig()
const baseUrl = String(config.public.siteUrl).replace(/\/+$/, '')
const route = useRoute()

const hreflangLinks = computed(() =>
  SUPPORTED_LOCALES.map((l) => ({
    key: `i18n-alt-${l.language}`,
    rel: 'alternate',
    href: `${baseUrl}${route.path}`,
    hreflang: l.language
  }))
)

useHead(() => ({ link: hreflangLinks.value }))
</script>

<template>
  <div>
    <Html :lang="currentLang" :dir="currentDir" :class="{ dark: isDark }">
      <Head>
        <Link
          v-for="link in head.link || []"
          :key="`${link.rel}-${link.hreflang || link.href}`"
          :rel="link.rel"
          :href="link.href"
          :hreflang="link.hreflang"
        />
        <Meta
          v-for="meta in head.meta || []"
          :key="`${meta.property || meta.name}-${meta.content}`"
          :property="meta.property"
          :name="meta.name"
          :content="meta.content"
        />
      </Head>
      <Body>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </Body>
    </Html>
  </div>
</template>
