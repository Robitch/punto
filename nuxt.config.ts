import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['@fontsource-variable/archivo/wdth.css', '~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundled up front so the dev server does not reload the page on first use.
    optimizeDeps: {
      include: [
        '@capacitor/core',
        '@capacitor/preferences',
        '@capacitor/screen-orientation',
        '@capacitor-community/bluetooth-le',
        '@capacitor-community/keep-awake',
        '@capacitor-community/text-to-speech',
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Punto',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no' },
        { name: 'color-scheme', content: 'dark light' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
