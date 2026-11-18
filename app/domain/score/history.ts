import type { MatchState } from './types'

/**
 * Stack of match states, oldest first. The last one is the current state.
 * Undoing a point simply drops the last state.
 */
export type MatchHistory = readonly [MatchState, ...MatchState[]]

export function startHistory(initial: MatchState): MatchHistory {
  return [initial]
}

export function currentState(history: MatchHistory): MatchState {
  return history[history.length - 1] ?? history[0]
}

/** Appends `next`, unless it is the current state (e.g. a point ignored after the match). */
export function pushState(history: MatchHistory, next: MatchState): MatchHistory {
  if (next === currentState(history)) return history
  return [...history, next]
}

export function canUndo(history: MatchHistory): boolean {
  return history.length > 1
}

export function undo(history: MatchHistory): MatchHistory {
  if (!canUndo(history)) return history
  const [first, ...rest] = history
  return [first, ...rest.slice(0, -1)]
}
