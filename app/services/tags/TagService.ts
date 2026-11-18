import type { Team } from '~/domain/score/types'

export type TagStatus = 'connected' | 'connecting' | 'disconnected' | 'unpaired'

export type TagServiceKind = 'keyboard' | 'ble'

/**
 * Source of raw button presses, one per team.
 * Presses are raw: single / double press detection is done by `PressDetector`,
 * shared by every implementation.
 */
export interface TagService {
  readonly kind: TagServiceKind
  start(): Promise<void>
  stop(): Promise<void>
  /** Subscribes to raw presses. Returns an unsubscribe function. */
  onPress(listener: (team: Team) => void): () => void
  /** Subscribes to status changes. The listener is called immediately with the current statuses. */
  onStatusChange(listener: (statuses: Readonly<Record<Team, TagStatus>>) => void): () => void
}
