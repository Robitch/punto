import { isNativePlatform } from '../platform'
import { storage } from '../storage'
import { createCapacitorBleAdapter } from './capacitorBleAdapter'
import { FakeBleAdapter } from './fakeBleAdapter'
import { createITagService } from './itagService'
import { createKeyboardService } from './keyboardService'
import type { TagService } from './TagService'

let instance: TagService | null = null

/**
 * Dev only: `?fake-ble` runs the real iTag service on simulated tags, driven from
 * the console through `window.__fakeBle` (e.g. `__fakeBle.advertise(...)`, `__fakeBle.press(id)`).
 */
function createFakeBleService(): TagService {
  const adapter = new FakeBleAdapter()
  ;(window as unknown as { __fakeBle: FakeBleAdapter }).__fakeBle = adapter
  return createITagService(adapter, storage)
}

/**
 * The single place where the TagService implementation is chosen:
 * iTags over Bluetooth LE on Android, keyboard simulation in the browser.
 */
export function getTagService(): TagService {
  if (!instance) {
    if (isNativePlatform()) instance = createITagService(createCapacitorBleAdapter(), storage)
    else if (import.meta.dev && new URLSearchParams(location.search).has('fake-ble')) instance = createFakeBleService()
    else instance = createKeyboardService()
  }
  return instance
}

export type { TagService, TagStatus } from './TagService'
