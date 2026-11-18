import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { storage } from '~/services/storage'

export type Theme = 'dark' | 'light'

interface StoredSettings {
  theme: Theme
  voiceEnabled: boolean
}

const STORAGE_KEY = 'settings'

export const useSettingsStore = defineStore('settings', () => {
  const prefersLight = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
  const theme = ref<Theme>(prefersLight ? 'light' : 'dark')
  const voiceEnabled = ref(true)
  const loaded = ref(false)

  function applyTheme(): void {
    document.documentElement.dataset.theme = theme.value
  }

  async function load(): Promise<void> {
    if (loaded.value) return
    const stored = await storage.get<Partial<StoredSettings>>(STORAGE_KEY)
    if (stored?.theme === 'dark' || stored?.theme === 'light') theme.value = stored.theme
    if (typeof stored?.voiceEnabled === 'boolean') voiceEnabled.value = stored.voiceEnabled
    loaded.value = true
    applyTheme()
  }

  watch([theme, voiceEnabled], () => {
    applyTheme()
    void storage.set(STORAGE_KEY, { theme: theme.value, voiceEnabled: voiceEnabled.value } satisfies StoredSettings)
  })

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function toggleVoice(): void {
    voiceEnabled.value = !voiceEnabled.value
  }

  return { theme, voiceEnabled, load, toggleTheme, toggleVoice }
})
