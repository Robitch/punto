import { currentServer, gameStatus, isTiebreak } from './engine'
import { otherTeam, type MatchState, type Score, type Team } from './types'

/** Team name as an adjective after a masculine noun: « Jeu bleu », « Avantage orange ». */
const TEAM_NAME: Record<Team, string> = { blue: 'bleu', orange: 'orange' }
/** Team name agreeing with « équipe »: « équipe bleue ». */
const TEAM_NAME_FEMININE: Record<Team, string> = { blue: 'bleue', orange: 'orange' }

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
] as const
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'] as const

/** French words for 0-69 (enough for any score); digits beyond that. */
export function numberToFrench(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 70) return String(n)
  if (n < 20) return UNITS[n] ?? String(n)
  const tens = TENS[Math.floor(n / 10)] ?? ''
  const unit = n % 10
  if (unit === 0) return tens
  if (unit === 1) return `${tens} et un`
  return `${tens}-${UNITS[unit] ?? ''}`
}

const TENNIS_WORDS = ['zéro', 'quinze', 'trente', 'quarante'] as const

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function sentences(...parts: string[]): string {
  return parts.filter(Boolean).join('. ')
}

/** « X – Y » (server first), or « X partout » when equal. */
function pair(server: string, receiver: string): string {
  return server === receiver ? capitalize(`${server} partout`) : capitalize(`${server} – ${receiver}`)
}

/** Score of the game in progress, without any transition (deuce, advantage, points). */
function pointsText(state: MatchState): string {
  const server = currentServer(state)
  const receiver = otherTeam(server)
  const { points } = state.game

  if (isTiebreak(state)) {
    return pair(numberToFrench(points[server]), numberToFrench(points[receiver]))
  }

  const status = gameStatus(state)
  if (status.type === 'deuce') return 'Égalité'
  if (status.type === 'advantage') return `Avantage ${TEAM_NAME[status.team]}`
  return pair(TENNIS_WORDS[points[server]] ?? 'quarante', TENNIS_WORDS[points[receiver]] ?? 'quarante')
}

/**
 * Games of the current set, leader first.
 * The leader is named unless it is `gameWinner` (who was just announced).
 */
function gamesText(games: Score, gameWinner: Team | null): string {
  if (games.blue === games.orange) {
    return capitalize(`${numberToFrench(games.blue)} ${games.blue > 1 ? 'jeux' : 'jeu'} partout`)
  }
  const leader: Team = games.blue > games.orange ? 'blue' : 'orange'
  const lead = games[leader]
  const trail = games[otherTeam(leader)]
  const text = `${numberToFrench(lead)} ${lead > 1 ? 'jeux' : 'jeu'} à ${numberToFrench(trail)}`
  const suffix = leader === gameWinner ? '' : ` pour ${TEAM_NAME[leader]}`
  return capitalize(text + suffix)
}

function tiebreakLabel(state: MatchState): string {
  if (state.game.kind === 'tiebreak') return 'Tie-break'
  if (state.game.kind === 'superTiebreak') return 'Super tie-break'
  return ''
}

function matchText(winner: Team): string {
  return `Jeu, set et match, équipe ${TEAM_NAME_FEMININE[winner]} !`
}

/** Text to speak after a point, given the states before and after it. */
export function announcePoint(prev: MatchState, next: MatchState): string {
  if (prev === next) return ''

  if (next.winner && !prev.winner) return matchText(next.winner)

  const lastSet = next.completedSets[next.completedSets.length - 1]
  if (next.completedSets.length > prev.completedSets.length && lastSet) {
    const winner = lastSet.winner
    const loser = otherTeam(winner)
    const score = lastSet.kind === 'set' ? lastSet.games : lastSet.points
    return sentences(
      `Jeu et set ${TEAM_NAME[winner]}`,
      pair(numberToFrench(score[winner]), numberToFrench(score[loser])),
      next.game.kind === 'superTiebreak' ? 'Super tie-break' : '',
    )
  }

  const gamesBefore = prev.games.blue + prev.games.orange
  const gamesAfter = next.games.blue + next.games.orange
  if (gamesAfter > gamesBefore) {
    const winner: Team = next.games.blue > prev.games.blue ? 'blue' : 'orange'
    return sentences(
      `Jeu ${TEAM_NAME[winner]}`,
      gamesText(next.games, winner),
      next.game.kind === 'tiebreak' ? 'Tie-break' : '',
    )
  }

  return pointsText(next)
}

/** Current score, as spoken on demand (e.g. after an undo). */
export function announceScore(state: MatchState): string {
  if (state.winner) return matchText(state.winner)
  const { blue, orange } = state.game.points
  if (blue + orange > 0) return pointsText(state)
  if (isTiebreak(state)) return sentences(tiebreakLabel(state), 'Zéro partout')
  if (state.games.blue + state.games.orange === 0) return 'Zéro partout'
  return gamesText(state.games, null)
}

/** Text to speak after the last point was cancelled, given the restored state. */
export function announceUndo(state: MatchState): string {
  return sentences('Point annulé', announceScore(state))
}
