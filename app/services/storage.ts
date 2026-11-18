/**
 * Small async key/value store for local persistence.
 * Browser implementation backed by localStorage; it will be swapped for
 * @capacitor/preferences on Android (same async API).
 */
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

const PREFIX = 'padel:'

function createLocalStorage(): KeyValueStorage {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const raw = localStorage.getItem(PREFIX + key)
        return raw === null ? null : (JSON.parse(raw) as T)
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

export const storage: KeyValueStorage = createLocalStorage()
