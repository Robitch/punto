import { Preferences } from '@capacitor/preferences'
import { isNativePlatform } from './platform'

/**
 * Small async key/value store for local persistence (JSON values).
 * Android: @capacitor/preferences. Browser: localStorage.
 */
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

const PREFIX = 'punto:'

function parse<T>(raw: string | null): T | null {
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function createLocalStorage(): KeyValueStorage {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        return parse<T>(localStorage.getItem(PREFIX + key))
      } catch {
        return null
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value))
      } catch {
        // Storage full or unavailable: persistence is best-effort.
      }
    },
    async remove(key) {
      try {
        localStorage.removeItem(PREFIX + key)
      } catch {
        // Ignore.
      }
    },
  }
}

function createPreferencesStorage(): KeyValueStorage {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const { value } = await Preferences.get({ key: PREFIX + key })
        return parse<T>(value)
      } catch (error) {
        console.warn('[storage] read failed', key, error)
        return null
      }
    },
    async set(key, value) {
      try {
        await Preferences.set({ key: PREFIX + key, value: JSON.stringify(value) })
      } catch (error) {
        console.warn('[storage] write failed', key, error)
      }
    },
    async remove(key) {
      try {
        await Preferences.remove({ key: PREFIX + key })
      } catch (error) {
        console.warn('[storage] remove failed', key, error)
      }
    },
  }
}

/** The storage implementation is chosen here, once. */
export const storage: KeyValueStorage = isNativePlatform() ? createPreferencesStorage() : createLocalStorage()
