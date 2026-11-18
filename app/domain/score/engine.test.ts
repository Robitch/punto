import { describe, expect, it } from 'vitest'
import { addPoint, createMatch, currentServer, displayPoints, gameStatus, setsWon } from './engine'
import { deepFreeze, newMatch, play, toSixAll, winGames, winSet } from './testUtils'
import { DEFAULT_SETTINGS, type MatchState, type Team } from './types'

/** Servers of the next `count` points, as letters ('b' / 'o'), playing points for `scorer`. */
function serversOfNextPoints(state: MatchState, count: number, scorer: Team = 'blue'): string {
  let next = state
  let out = ''
  for (let i = 0; i < count; i++) {
    out += currentServer(next) === 'blue' ? 'b' : 'o'
    next = addPoint(next, scorer)
  }
  return out
}

describe('createMatch', () => {
  it('starts at 0-0 with no sets and the chosen server', () => {
    const state = createMatch({ ...DEFAULT_SETTINGS, firstServer: 'orange' })
    expect(state.completedSets).toEqual([])
    expect(state.games).toEqual({ blue: 0, orange: 0 })
    expect(state.game).toEqual({ kind: 'regular', points: { blue: 0, orange: 0 } })
    expect(state.gameServer).toBe('orange')
    expect(currentServer(state)).toBe('orange')
    expect(state.winner).toBeNull()
  })
})

describe('regular game', () => {
  it('counts 0 → 15 → 30 → 40', () => {
    const s0 = newMatch()
    expect(displayPoints(s0)).toEqual({ blue: '0', orange: '0' })
    expect(displayPoints(play(s0, 'b'))).toEqual({ blue: '15', orange: '0' })
    expect(displayPoints(play(s0, 'bb'))).toEqual({ blue: '30', orange: '0' })
    expect(displayPoints(play(s0, 'bbb'))).toEqual({ blue: '40', orange: '0' })
    expect(displayPoints(play(s0, 'bbbo'))).toEqual({ blue: '40', orange: '15' })
  })

  it('wins the game on the point after 40 when ahead by two', () => {
    const state = play(newMatch(), 'bbbb')
    expect(state.games).toEqual({ blue: 1, orange: 0 })
    expect(state.game.points).toEqual({ blue: 0, orange: 0 })
  })

  it('wins 40-30 → game', () => {
    const state = play(newMatch(), 'bbboob')
    expect(state.games).toEqual({ blue: 1, orange: 0 })
  })

  it('goes to deuce at 40-40, not to game', () => {
    const state = play(newMatch(), 'bbbooo')
    expect(gameStatus(state)).toEqual({ type: 'deuce' })
    expect(displayPoints(state)).toEqual({ blue: '40', orange: '40' })
    expect(state.games).toEqual({ blue: 0, orange: 0 })
  })

  it('gives advantage after deuce', () => {
    const state = play(newMatch(), 'bbbooob')
    expect(gameStatus(state)).toEqual({ type: 'advantage', team: 'blue' })
    expect(displayPoints(state)).toEqual({ blue: 'AV', orange: '40' })
    expect(state.games).toEqual({ blue: 0, orange: 0 })
  })

  it('wins the game from advantage', () => {
    const state = play(newMatch(), 'bbbooobb')
    expect(state.games).toEqual({ blue: 1, orange: 0 })
  })

  it('goes back to deuce when the advantage is lost, as many times as needed', () => {
    let state = play(newMatch(), 'bbbooo')
    for (let i = 0; i < 5; i++) {
      state = play(state, 'b')
      expect(gameStatus(state)).toEqual({ type: 'advantage', team: 'blue' })
      state = play(state, 'o')
      expect(gameStatus(state)).toEqual({ type: 'deuce' })
    }
    state = play(state, 'oo')
    expect(state.games).toEqual({ blue: 0, orange: 1 })
  })
})

describe('set', () => {
  it('is won 6-4', () => {
    let state = newMatch()
    state = winGames(state, 'blue', 2)
    state = winGames(state, 'orange', 4)
    state = winGames(state, 'blue', 4)
    expect(state.completedSets).toEqual([
      { kind: 'set', games: { blue: 6, orange: 4 }, tiebreak: null, winner: 'blue' },
    ])
    expect(state.games).toEqual({ blue: 0, orange: 0 })
  })

  it('is not won at 6-5, but is won 7-5', () => {
    let state = newMatch()
    for (let i = 0; i < 5; i++) {
      state = winGames(state, 'blue', 1)
      state = winGames(state, 'orange', 1)
    }
    state = winGames(state, 'blue', 1)
    expect(state.games).toEqual({ blue: 6, orange: 5 })
    expect(state.completedSets).toHaveLength(0)
    state = winGames(state, 'blue', 1)
    expect(state.completedSets).toEqual([
      { kind: 'set', games: { blue: 7, orange: 5 }, tiebreak: null, winner: 'blue' },
    ])
  })

  it('starts a tie-break at 6-6', () => {
    const state = toSixAll(newMatch())
    expect(state.games).toEqual({ blue: 6, orange: 6 })
    expect(state.game.kind).toBe('tiebreak')
    expect(displayPoints(state)).toEqual({ blue: '0', orange: '0' })
  })
})

describe('tie-break (7 points)', () => {
  const tiebreak = toSixAll(newMatch())

  it('displays plain point counts', () => {
    expect(displayPoints(play(tiebreak, 'bbbbo'))).toEqual({ blue: '4', orange: '1' })
  })

  it('is won 7-5', () => {
    const state = play(tiebreak, 'bbbbbooooo' + 'bb')
    expect(state.completedSets[0]).toEqual({
      kind: 'set',
      games: { blue: 7, orange: 6 },
      tiebreak: { blue: 7, orange: 5 },
      winner: 'blue',
    })
  })

  it('is not won 7-6, needs two points ahead (8-6)', () => {
    let state = play(tiebreak, 'bobobobobobo') // 6-6
    state = play(state, 'b') // 7-6
    expect(state.completedSets).toHaveLength(0)
    expect(displayPoints(state)).toEqual({ blue: '7', orange: '6' })
    state = play(state, 'o') // 7-7
    state = play(state, 'oo') // 7-9
    expect(state.completedSets[0]).toEqual({
      kind: 'set',
      games: { blue: 6, orange: 7 },
      tiebreak: { blue: 7, orange: 9 },
      winner: 'orange',
    })
  })

  it('is won 7-0', () => {
    const state = play(tiebreak, 'ooooooo')
    expect(state.completedSets[0]?.winner).toBe('orange')
    expect(state.game.kind).toBe('regular')
  })
})

describe('deciding set', () => {
  const oneSetAll = winSet(winSet(newMatch(), 'blue'), 'orange')

  it('is a super tie-break by default', () => {
    expect(oneSetAll.completedSets).toHaveLength(2)
    expect(oneSetAll.winner).toBeNull()
    expect(oneSetAll.game.kind).toBe('superTiebreak')
    expect(oneSetAll.games).toEqual({ blue: 0, orange: 0 })
  })

  it('super tie-break is played to 10 points', () => {
    const state = play(oneSetAll, 'bbbbbbbbbooooooo') // 9-7
    expect(state.winner).toBeNull()
    expect(displayPoints(state)).toEqual({ blue: '9', orange: '7' })
    const won = play(state, 'b') // 10-7
    expect(won.winner).toBe('blue')
    expect(won.completedSets[2]).toEqual({
      kind: 'superTiebreak',
      points: { blue: 10, orange: 7 },
      winner: 'blue',
    })
  })

  it('super tie-break needs two points ahead (10-9 is not enough)', () => {
    let state = play(oneSetAll, 'bobobobobobobobobo') // 9-9
    state = play(state, 'b') // 10-9
    expect(state.winner).toBeNull()
    state = play(state, 'o') // 10-10
    state = play(state, 'oo') // 10-12
    expect(state.winner).toBe('orange')
    expect(state.completedSets[2]).toEqual({
      kind: 'superTiebreak',
      points: { blue: 10, orange: 12 },
      winner: 'orange',
    })
  })

  it('is a full set when configured', () => {
    let state = winSet(winSet(newMatch({ decidingSet: 'fullSet' }), 'blue'), 'orange')
    expect(state.game.kind).toBe('regular')
    state = winGames(state, 'blue', 5)
    expect(state.winner).toBeNull()
    state = winGames(state, 'blue', 1)
    expect(state.winner).toBe('blue')
    expect(state.completedSets[2]).toEqual({
      kind: 'set',
      games: { blue: 6, orange: 0 },
      tiebreak: null,
      winner: 'blue',
    })
  })

  it('a full deciding set has a tie-break at 6-6', () => {
    let state = winSet(winSet(newMatch({ decidingSet: 'fullSet' }), 'blue'), 'orange')
    state = toSixAll(state)
    expect(state.game.kind).toBe('tiebreak')
    state = play(state, 'ooooooo')
    expect(state.winner).toBe('orange')
  })
})

describe('end of match', () => {
  it('is won 2 sets to 0', () => {
    const state = winSet(winSet(newMatch(), 'orange'), 'orange')
    expect(state.winner).toBe('orange')
    expect(setsWon(state)).toEqual({ blue: 0, orange: 2 })
  })

  it('is won 2 sets to 1', () => {
    let state = winSet(winSet(newMatch(), 'blue'), 'orange')
    state = play(state, 'b'.repeat(10))
    expect(state.winner).toBe('blue')
    expect(setsWon(state)).toEqual({ blue: 2, orange: 1 })
  })

  it('is not won after one set', () => {
    expect(winSet(newMatch(), 'blue').winner).toBeNull()
  })

  it('ignores points once the match is over', () => {
    const over = winSet(winSet(newMatch(), 'orange'), 'orange')
    expect(addPoint(over, 'blue')).toBe(over)
    expect(addPoint(over, 'orange')).toBe(over)
  })
})

describe('service rotation', () => {
  it('changes server every game', () => {
    let state = newMatch({ firstServer: 'orange' })
    const servers: Team[] = []
    for (let i = 0; i < 5; i++) {
      servers.push(currentServer(state))
      state = winGames(state, i % 2 === 0 ? 'blue' : 'orange', 1)
    }
    expect(servers).toEqual(['orange', 'blue', 'orange', 'blue', 'orange'])
  })

  it('keeps the same server for every point of a regular game', () => {
    expect(serversOfNextPoints(newMatch(), 3)).toBe('bbb')
  })

  it('keeps alternating across sets (after a 6-0 set, the 7th game server starts the next set)', () => {
    const state = winSet(newMatch({ firstServer: 'blue' }), 'blue')
    // Games 1..6 served by b,o,b,o,b,o → next set starts with blue.
    expect(currentServer(state)).toBe('blue')
    const after61 = winGames(winGames(newMatch({ firstServer: 'blue' }), 'orange', 1), 'blue', 6)
    // 7 games played → next server is orange.
    expect(after61.completedSets).toHaveLength(1)
    expect(currentServer(after61)).toBe('orange')
  })

  it('in a tie-break, the first server serves 1 point then players alternate every 2 points', () => {
    const state = toSixAll(newMatch({ firstServer: 'blue' }))
    // 12 games played → it is blue's turn to serve.
    expect(state.gameServer).toBe('blue')
    expect(serversOfNextPoints(state, 6, 'blue')).toBe('boobbo')
  })

  it('in a tie-break, the team whose turn it was serves first', () => {
    // 12 games starting with orange → orange serves the tie-break first.
    const state = toSixAll(newMatch({ firstServer: 'orange' }))
    expect(serversOfNextPoints(state, 7, 'orange')).toBe('obboobb')
  })

  it('after a tie-break, the team that received first in the tie-break serves the next set', () => {
    const blueServedTiebreak = play(toSixAll(newMatch({ firstServer: 'blue' })), 'bbbbbbb')
    expect(blueServedTiebreak.completedSets).toHaveLength(1)
    expect(currentServer(blueServedTiebreak)).toBe('orange')

    // Same regardless of how many points were played in the tie-break.
    const longTiebreak = play(toSixAll(newMatch({ firstServer: 'blue' })), 'bobobobobobobb')
    expect(longTiebreak.completedSets).toHaveLength(1)
    expect(currentServer(longTiebreak)).toBe('orange')
  })

  it('super tie-break: the team whose turn it was serves 1 point, then alternate every 2 points', () => {
    // 12 games played (6-0, 0-6) starting with blue → blue's turn.
    const state = winSet(winSet(newMatch({ firstServer: 'blue' }), 'blue'), 'orange')
    expect(serversOfNextPoints(state, 9, 'blue')).toBe('boobboobb')
  })

  it('super tie-break after a set won in a tie-break: the team that received first serves', () => {
    let state = winSet(newMatch({ firstServer: 'blue' }), 'blue') // 6 games, blue to serve
    state = toSixAll(state) // 12 more games, blue serves the tie-break
    state = play(state, 'ooooooo') // orange wins tie-break → 1 set all
    expect(state.game.kind).toBe('superTiebreak')
    expect(currentServer(state)).toBe('orange')
  })
})

describe('immutability', () => {
  it('never mutates the input state', () => {
    let state = deepFreeze(newMatch())
    // Exercise every transition: points, deuce, game, tie-break, set, super tie-break, match.
    const sequence = 'bbbooobobb' + 'b'.repeat(20) + 'o'.repeat(4 * 6) + 'bobobobobobobobobobb'
    for (const char of sequence) {
      const snapshot = JSON.stringify(state)
      const next = addPoint(state, char === 'b' ? 'blue' : 'orange')
      expect(JSON.stringify(state)).toBe(snapshot)
      state = deepFreeze(next)
    }
    expect(state.winner).toBe('blue')
  })
})
