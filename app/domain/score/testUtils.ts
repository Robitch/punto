import { addPoint, createMatch } from './engine'
import { DEFAULT_SETTINGS, type MatchSettings, type MatchState, type Team } from './types'

/** Plays a sequence of points: 'b' = blue, 'o' = orange (other characters are ignored). */
export function play(state: MatchState, sequence: string): MatchState {
  let next = state
  for (const char of sequence) {
    if (char === 'b') next = addPoint(next, 'blue')
    else if (char === 'o') next = addPoint(next, 'orange')
  }
  return next
}

export function newMatch(settings: Partial<MatchSettings> = {}): MatchState {
  return createMatch({ ...DEFAULT_SETTINGS, ...settings })
}

/** Wins `count` games in a row for `team`, assuming each game starts at 0-0. */
export function winGames(state: MatchState, team: Team, count: number): MatchState {
  const letter = team === 'blue' ? 'b' : 'o'
  return play(state, letter.repeat(4 * count))
}

/** Plays alternating games from 0-0 in a set until 6-6 (tie-break starts). */
export function toSixAll(state: MatchState): MatchState {
  let next = state
  for (let i = 0; i < 6; i++) {
    next = winGames(next, 'blue', 1)
    next = winGames(next, 'orange', 1)
  }
  return next
}

/** Wins a 6-0 set for `team`. */
export function winSet(state: MatchState, team: Team): MatchState {
  return winGames(state, team, 6)
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
    Object.freeze(value)
  }
  return value
}
