export const TEAMS = ['blue', 'orange'] as const
export type Team = (typeof TEAMS)[number]

export function otherTeam(team: Team): Team {
  return team === 'blue' ? 'orange' : 'blue'
}

/** A pair of counters, one per team (points, games or sets). */
export type Score = Readonly<Record<Team, number>>

export type GameKind = 'regular' | 'tiebreak' | 'superTiebreak'

/** How the deciding set is played when sets are tied. */
export type DecidingSetFormat = 'superTiebreak' | 'fullSet'

/**
 * How a game is decided at 40-40.
 * Only 'advantage' exists in V1; 'goldenPoint' (decisive point) can be added later.
 */
export type DeuceRule = 'advantage'

export interface MatchSettings {
  readonly firstServer: Team
  readonly decidingSet: DecidingSetFormat
  readonly deuceRule: DeuceRule
  readonly setsToWin: number
}

export type CompletedSet =
  | {
      readonly kind: 'set'
      readonly games: Score
      /** Points of the tie-break, when the set was decided by one (7-6). */
      readonly tiebreak: Score | null
      readonly winner: Team
    }
  | {
      readonly kind: 'superTiebreak'
      /** Points of the super tie-break (e.g. 10-8). */
      readonly points: Score
      readonly winner: Team
    }

export interface GameState {
  readonly kind: GameKind
  /** Raw points won in this game (0, 1, 2, 3, 4…), not the tennis display value. */
  readonly points: Score
}

export interface MatchState {
  readonly settings: MatchSettings
  readonly completedSets: readonly CompletedSet[]
  /** Games of the set in progress. */
  readonly games: Score
  readonly game: GameState
  /**
   * Team serving this game. In a tie-break, the team serving the first point
   * (the actual server for each point is given by `currentServer`).
   */
  readonly gameServer: Team
  readonly winner: Team | null
}

export const DEFAULT_SETTINGS: MatchSettings = {
  firstServer: 'blue',
  decidingSet: 'superTiebreak',
  deuceRule: 'advantage',
  setsToWin: 2,
}
