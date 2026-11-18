import {
  otherTeam,
  TEAMS,
  type CompletedSet,
  type GameKind,
  type MatchSettings,
  type MatchState,
  type Score,
  type Team,
} from './types'

const ZERO: Score = { blue: 0, orange: 0 }

/** Games needed to win a set (a tie-break is played at GAMES_PER_SET all). */
export const GAMES_PER_SET = 6
export const TIEBREAK_POINTS = 7
export const SUPER_TIEBREAK_POINTS = 10

export function createMatch(settings: MatchSettings): MatchState {
  return {
    settings,
    completedSets: [],
    games: ZERO,
    game: { kind: 'regular', points: ZERO },
    gameServer: settings.firstServer,
    winner: null,
  }
}

function increment(score: Score, team: Team): Score {
  return { ...score, [team]: score[team] + 1 }
}

function isGameWon(state: MatchState, points: Score, team: Team): boolean {
  const own = points[team]
  const lead = own - points[otherTeam(team)]
  switch (state.game.kind) {
    case 'regular':
      // deuceRule 'advantage': two clear points needed past 40.
      // A future 'goldenPoint' rule would accept lead >= 1 here.
      return own >= 4 && lead >= 2
    case 'tiebreak':
      return own >= TIEBREAK_POINTS && lead >= 2
    case 'superTiebreak':
      return own >= SUPER_TIEBREAK_POINTS && lead >= 2
  }
}

function isSetWon(games: Score, team: Team): boolean {
  const lead = games[team] - games[otherTeam(team)]
  return games[team] >= GAMES_PER_SET && lead >= 2
}

function countSets(completedSets: readonly CompletedSet[]): Score {
  return completedSets.reduce<Score>((acc, set) => increment(acc, set.winner), ZERO)
}

export function setsWon(state: MatchState): Score {
  return countSets(state.completedSets)
}

/** Kind of the first game of a new set, given the sets already completed. */
function firstGameKindOfSet(settings: MatchSettings, completedSets: readonly CompletedSet[]): GameKind {
  const sets = countSets(completedSets)
  const isDecidingSet = sets.blue === settings.setsToWin - 1 && sets.orange === settings.setsToWin - 1
  return isDecidingSet && settings.decidingSet === 'superTiebreak' ? 'superTiebreak' : 'regular'
}

function closeSet(state: MatchState, completed: CompletedSet, nextServer: Team): MatchState {
  const completedSets = [...state.completedSets, completed]
  const sets = countSets(completedSets)
  const winner = TEAMS.find((team) => sets[team] >= state.settings.setsToWin) ?? null
  return {
    ...state,
    completedSets,
    games: ZERO,
    game: { kind: firstGameKindOfSet(state.settings, completedSets), points: ZERO },
    gameServer: nextServer,
    winner,
  }
}

/**
 * Returns the state after `team` wins a point. Never mutates `state`.
 * Once the match is over, the same state is returned.
 */
export function addPoint(state: MatchState, team: Team): MatchState {
  if (state.winner) return state

  const points = increment(state.game.points, team)
  if (!isGameWon(state, points, team)) {
    return { ...state, game: { ...state.game, points } }
  }

  // Regular game: usual alternation. Tie-break: the team that received first
  // in the tie-break serves the next game (gameServer = tie-break first server).
  const nextServer = otherTeam(state.gameServer)

  switch (state.game.kind) {
    case 'superTiebreak':
      return closeSet(state, { kind: 'superTiebreak', points, winner: team }, nextServer)

    case 'tiebreak': {
      const games = increment(state.games, team)
      return closeSet(state, { kind: 'set', games, tiebreak: points, winner: team }, nextServer)
    }

    case 'regular': {
      const games = increment(state.games, team)
      if (isSetWon(games, team)) {
        return closeSet(state, { kind: 'set', games, tiebreak: null, winner: team }, nextServer)
      }
      const isTiebreak = games.blue === GAMES_PER_SET && games.orange === GAMES_PER_SET
      return {
        ...state,
        games,
        game: { kind: isTiebreak ? 'tiebreak' : 'regular', points: ZERO },
        gameServer: nextServer,
      }
    }
  }
}

export function isTiebreak(state: MatchState): boolean {
  return state.game.kind !== 'regular'
}

/**
 * Team serving the next point.
 * Regular game: the game server. Tie-breaks: the first server serves 1 point,
 * then teams alternate every 2 points.
 */
export function currentServer(state: MatchState): Team {
  if (!isTiebreak(state)) return state.gameServer
  const played = state.game.points.blue + state.game.points.orange
  const block = Math.floor((played + 1) / 2)
  return block % 2 === 0 ? state.gameServer : otherTeam(state.gameServer)
}

export type GameStatus =
  | { type: 'points' }
  | { type: 'deuce' }
  | { type: 'advantage'; team: Team }

/** Deuce / advantage status of a regular game. Tie-breaks are always 'points'. */
export function gameStatus(state: MatchState): GameStatus {
  const { blue, orange } = state.game.points
  if (isTiebreak(state) || blue < 3 || orange < 3) return { type: 'points' }
  if (blue === orange) return { type: 'deuce' }
  return { type: 'advantage', team: blue > orange ? 'blue' : 'orange' }
}

const TENNIS_POINTS = ['0', '15', '30', '40'] as const

/** Points as shown on screen: 0/15/30/40/AV, or raw counts in tie-breaks. */
export function displayPoints(state: MatchState): Record<Team, string> {
  const { points } = state.game
  if (isTiebreak(state)) return { blue: String(points.blue), orange: String(points.orange) }
  const status = gameStatus(state)
  if (status.type === 'deuce') return { blue: '40', orange: '40' }
  if (status.type === 'advantage') {
    return status.team === 'blue' ? { blue: 'AV', orange: '40' } : { blue: '40', orange: 'AV' }
  }
  return {
    blue: TENNIS_POINTS[points.blue] ?? '40',
    orange: TENNIS_POINTS[points.orange] ?? '40',
  }
}
