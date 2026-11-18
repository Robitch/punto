import { createKeyboardService } from './keyboardService'
import type { TagService } from './TagService'

let instance: TagService | null = null

/**
 * The single place where the TagService implementation is chosen.
 * Android (Capacitor.isNativePlatform()) will use the BLE implementation in a later step;
 * for now the browser keyboard simulation is always used.
 */
export function getTagService(): TagService {
  instance ??= createKeyboardService()
  return instance
}

export type { TagService, TagStatus } from './TagService'
