import type { MatchState } from './types'

export interface SetScore {
  blue: number
  orange: number
  /** True for the set in progress. */
  current: boolean
}

/**
 * Compact score of the whole match: games of each set (super tie-break points
 * for a super tie-break), followed by the set in progress unless the match is over.
 */
export function scoreLine(state: MatchState): SetScore[] {
  const sets: SetScore[] = state.completedSets.map((set) => {
    const score = set.kind === 'set' ? set.games : set.points
    return { blue: score.blue, orange: score.orange, current: false }
  })
  if (state.winner) return sets
  const current = state.game.kind === 'superTiebreak' ? state.game.points : state.games
  return [...sets, { blue: current.blue, orange: current.orange, current: true }]
}
