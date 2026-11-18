import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['@fontsource-variable/inter', '~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Padel',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no' },
        { name: 'color-scheme', content: 'dark light' },
      ],
    },
  },
})
