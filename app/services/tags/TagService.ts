import type { Team } from '~/domain/score/types'

export type TagStatus = 'connected' | 'connecting' | 'disconnected' | 'unpaired'

export type TagServiceKind = 'keyboard' | 'ble'

/** Why tags cannot be used right now. */
export type TagErrorReason = 'bluetooth-off' | 'permission'

export class TagError extends Error {
  constructor(
    readonly reason: TagErrorReason,
    cause?: unknown,
  ) {
    super(reason, { cause })
    this.name = 'TagError'
  }
}

export interface PairingListener {
  /** Number of nearby tags connected and ready to be pressed. */
  onCandidates(count: number): void
  /** A nearby tag was pressed. */
  onPress(deviceId: string): void
}

/** Pairing flow: scan and connect nearby tags, then assign the pressed ones to the teams. */
export interface TagPairing {
  /** Throws a TagError if Bluetooth is off or not permitted. */
  begin(listener: PairingListener): Promise<void>
  beep(deviceId: string): Promise<boolean>
  /** Saves the assignment; the assigned tags become the team tags. */
  finish(assignment: Readonly<Record<Team, string>>): Promise<void>
  /** Stops pairing and goes back to the previously paired tags. */
  cancel(): Promise<void>
}

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
  /** Makes the team's tag beep. Returns false if it could not. */
  beep(team: Team): Promise<boolean>
  /** Null when the implementation needs no pairing (keyboard). */
  readonly pairing: TagPairing | null
}
