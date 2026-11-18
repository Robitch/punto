import type { Team } from '../score/types'

/** Two presses of the same tag within this delay = undo. */
export const DOUBLE_PRESS_WINDOW_MS = 400
/** Presses closer than this to the previous accepted press of the same tag are bounces. */
export const DEBOUNCE_MS = 60

export type PressGesture =
  | { type: 'point'; team: Team }
  /** Undo the last point, whoever scored it. `team` is the tag that was double-pressed. */
  | { type: 'undo'; team: Team }

export interface PressDetectorOptions {
  doublePressWindowMs?: number
  debounceMs?: number
  /** Clock, injectable for tests (defaults to Date.now, which fake timers control). */
  now?: () => number
}

interface PendingPress {
  team: Team
  at: number
  timer: ReturnType<typeof setTimeout>
}

/**
 * Turns raw button presses (from a BLE tag or the keyboard) into gestures:
 * - single press → point, emitted once the double-press window has elapsed;
 * - two presses of the same tag within the window → undo (no point);
 * - a press of the other tag while one is pending validates the pending point immediately;
 * - bounces (< debounce delay) are ignored.
 */
export class PressDetector {
  private readonly windowMs: number
  private readonly debounceMs: number
  private readonly now: () => number
  private pending: PendingPress | null = null
  private readonly lastAcceptedAt = new Map<Team, number>()

  constructor(
    private readonly onGesture: (gesture: PressGesture) => void,
    options: PressDetectorOptions = {},
  ) {
    this.windowMs = options.doublePressWindowMs ?? DOUBLE_PRESS_WINDOW_MS
    this.debounceMs = options.debounceMs ?? DEBOUNCE_MS
    this.now = options.now ?? Date.now
  }

  press(team: Team): void {
    const at = this.now()
    const last = this.lastAcceptedAt.get(team)
    if (last !== undefined && at - last < this.debounceMs) return
    this.lastAcceptedAt.set(team, at)

    // The timer may fire late on a busy device: the timestamps are the reference.
    if (this.pending && at - this.pending.at >= this.windowMs) this.flush()

    if (this.pending?.team === team) {
      clearTimeout(this.pending.timer)
      this.pending = null
      this.onGesture({ type: 'undo', team })
      return
    }

    this.flush()
    this.pending = {
      team,
      at,
      timer: setTimeout(() => this.flush(), this.windowMs),
    }
  }

  /** Emits the pending point now, if any. */
  flush(): void {
    if (!this.pending) return
    const { team, timer } = this.pending
    clearTimeout(timer)
    this.pending = null
    this.onGesture({ type: 'point', team })
  }

  /** Drops any pending press without emitting it. */
  dispose(): void {
    if (this.pending) clearTimeout(this.pending.timer)
    this.pending = null
  }
}
