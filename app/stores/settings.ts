import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { DEFAULT_SETTINGS, type DecidingSetFormat, type MatchSettings, type Team } from '~/domain/score/types'
import { syncSystemBarsTheme } from '~/services/device'
import { storage } from '~/services/storage'

export type Theme = 'dark' | 'light'

interface StoredSettings {
  theme: Theme
  voiceEnabled: boolean
  /** Last choices made on the home screen, reused for the next match. */
  firstServer: Team
  decidingSet: DecidingSetFormat
}

const STORAGE_KEY = 'settings'

export const useSettingsStore = defineStore('settings', () => {
  const prefersLight = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
  const theme = ref<Theme>(prefersLight ? 'light' : 'dark')
  const voiceEnabled = ref(true)
  const firstServer = ref<Team>(DEFAULT_SETTINGS.firstServer)
  const decidingSet = ref<DecidingSetFormat>(DEFAULT_SETTINGS.decidingSet)
  const loaded = ref(false)

  function applyTheme(): void {
    document.documentElement.dataset.theme = theme.value
    void syncSystemBarsTheme(theme.value)
  }

  async function load(): Promise<void> {
    if (loaded.value) return
    const stored = await storage.get<Partial<StoredSettings>>(STORAGE_KEY)
    if (stored?.theme === 'dark' || stored?.theme === 'light') theme.value = stored.theme
    if (typeof stored?.voiceEnabled === 'boolean') voiceEnabled.value = stored.voiceEnabled
    if (stored?.firstServer === 'blue' || stored?.firstServer === 'orange') firstServer.value = stored.firstServer
    if (stored?.decidingSet === 'superTiebreak' || stored?.decidingSet === 'fullSet') decidingSet.value = stored.decidingSet
    loaded.value = true
    applyTheme()
  }

  watch([theme, voiceEnabled, firstServer, decidingSet], () => {
    applyTheme()
    if (!loaded.value) return
    const stored: StoredSettings = {
      theme: theme.value,
      voiceEnabled: voiceEnabled.value,
      firstServer: firstServer.value,
      decidingSet: decidingSet.value,
    }
    void storage.set(STORAGE_KEY, stored)
  })

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function toggleVoice(): void {
    voiceEnabled.value = !voiceEnabled.value
  }

  /** Settings for a new match, from the current home screen choices. */
  function matchSettings(): MatchSettings {
    return { ...DEFAULT_SETTINGS, firstServer: firstServer.value, decidingSet: decidingSet.value }
  }

  return { theme, voiceEnabled, firstServer, decidingSet, loaded, load, toggleTheme, toggleVoice, matchSettings }
})
