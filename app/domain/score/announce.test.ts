import { describe, expect, it } from 'vitest'
import { announcePoint, announceUndo, numberToFrench } from './announce'
import { addPoint } from './engine'
import { newMatch, play, toSixAll, winGames, winSet } from './testUtils'
import type { MatchState, Team } from './types'

/** Announcement for `team` scoring on top of `state`. */
function after(state: MatchState, team: Team): string {
  return announcePoint(state, addPoint(state, team))
}

describe('numberToFrench', () => {
  it.each([
    [0, 'zéro'], [1, 'un'], [6, 'six'], [10, 'dix'], [16, 'seize'], [17, 'dix-sept'],
    [20, 'vingt'], [21, 'vingt et un'], [22, 'vingt-deux'], [31, 'trente et un'], [45, 'quarante-cinq'],
  ])('%i → %s', (n, word) => {
    expect(numberToFrench(n)).toBe(word)
  })
})

describe('points in a regular game (server first)', () => {
  const blueServes = newMatch({ firstServer: 'blue' })
  const orangeServes = newMatch({ firstServer: 'orange' })

  it('announces the server score first', () => {
    expect(after(blueServes, 'blue')).toBe('Quinze – zéro')
    expect(after(orangeServes, 'blue')).toBe('Zéro – quinze')
    expect(after(play(blueServes, 'bbo'), 'blue')).toBe('Quarante – quinze')
    expect(after(play(orangeServes, 'bbb'), 'orange')).toBe('Quinze – quarante')
  })

  it('announces "partout" for equal scores below 40', () => {
    expect(after(play(blueServes, 'b'), 'orange')).toBe('Quinze partout')
    expect(after(play(blueServes, 'bbo'), 'orange')).toBe('Trente partout')
  })

  it('announces 40-30 as "Quarante – trente"', () => {
    expect(after(play(blueServes, 'bboo'), 'blue')).toBe('Quarante – trente')
  })

  it('announces deuce at 40-40 and when advantage is lost', () => {
    expect(after(play(blueServes, 'bbboo'), 'orange')).toBe('Égalité')
    expect(after(play(blueServes, 'bbbooob'), 'orange')).toBe('Égalité')
  })

  it('announces advantage with the team colour', () => {
    expect(after(play(blueServes, 'bbbooo'), 'blue')).toBe('Avantage bleu')
    expect(after(play(blueServes, 'bbbooo'), 'orange')).toBe('Avantage orange')
  })
})

describe('end of game', () => {
  const s = newMatch()

  it('announces the winner and the games, leader first', () => {
    expect(after(play(s, 'bbb'), 'blue')).toBe('Jeu bleu. Un jeu à zéro')
    const twoAll = winGames(winGames(s, 'blue', 2), 'orange', 2)
    expect(after(play(twoAll, 'bbb'), 'blue')).toBe('Jeu bleu. Trois jeux à deux')
  })

  it('names the leader when the game winner is behind', () => {
    const state = winGames(winGames(s, 'blue', 3), 'orange', 1) // 3-1
    expect(after(play(state, 'ooo'), 'orange')).toBe('Jeu orange. Trois jeux à deux pour bleu')
  })

  it('announces "partout" when games are tied', () => {
    expect(after(play(winGames(s, 'blue', 1), 'ooo'), 'orange')).toBe('Jeu orange. Un jeu partout')
    const state = winGames(winGames(s, 'blue', 3), 'orange', 2) // 3-2
    expect(after(play(state, 'ooo'), 'orange')).toBe('Jeu orange. Trois jeux partout')
  })

  it('announces the start of the tie-break at 6-6', () => {
    let state = s
    for (let i = 0; i < 5; i++) state = winGames(winGames(state, 'blue', 1), 'orange', 1)
    state = winGames(state, 'blue', 1) // 6-5
    expect(after(play(state, 'ooo'), 'orange')).toBe('Jeu orange. Six jeux partout. Tie-break')
  })
})

describe('end of set', () => {
  it('announces "Jeu et set" with the set score, winner first', () => {
    let state = winGames(newMatch(), 'orange', 4)
    state = winGames(state, 'blue', 5) // 5-4 blue
    expect(after(play(state, 'bbb'), 'blue')).toBe('Jeu et set bleu. Six – quatre')
  })

  it('announces a set won in a tie-break as 7-6', () => {
    const state = play(toSixAll(newMatch()), 'oooooo')
    expect(after(state, 'orange')).toBe('Jeu et set orange. Sept – six')
  })

  it('announces the super tie-break when sets are tied', () => {
    const state = winGames(winSet(newMatch(), 'orange'), 'blue', 5)
    expect(after(play(state, 'bbb'), 'blue')).toBe('Jeu et set bleu. Six – zéro. Super tie-break')
  })

  it('does not announce a super tie-break when the deciding set is a full set', () => {
    const state = winGames(winSet(newMatch({ decidingSet: 'fullSet' }), 'orange'), 'blue', 5)
    expect(after(play(state, 'bbb'), 'blue')).toBe('Jeu et set bleu. Six – zéro')
  })
})

describe('tie-break points (server first)', () => {
  // 12 games from blue → blue serves first point; then orange serves points 2-3, blue 4-5…
  const tiebreak = toSixAll(newMatch({ firstServer: 'blue' }))

  it('announces the score of the next server first', () => {
    // Blue served point 1 and wins it; orange serves points 2-3 → orange score first.
    expect(after(tiebreak, 'blue')).toBe('Zéro – un')
  })

  it('switches the order when the server changes', () => {
    // After 1 point (blue 1-0), orange serves → orange score first.
    expect(after(play(tiebreak, 'b'), 'blue')).toBe('Zéro – deux')
  })

  it('announces "Quatre – trois" with the server first', () => {
    // 6 points played (4-2 blue) → point 7 served by orange; after point 7 the server is orange.
    const state = play(tiebreak, 'bbbboo') // 4-2, 6 points
    // After orange scores → 4-3, 7 points played → server of point 8 is blue.
    expect(after(state, 'orange')).toBe('Quatre – trois')
  })

  it('announces "partout" for tied tie-break scores', () => {
    expect(after(play(tiebreak, 'bbo'), 'orange')).toBe('Deux partout')
  })

  it('announces super tie-break points beyond ten', () => {
    const superTiebreak = winSet(winSet(newMatch(), 'blue'), 'orange')
    const state = play(superTiebreak, 'bobobobobobobobobobo') // 10-10
    // 11-10 after 21 points: point 22 is served by orange (blue served first).
    expect(after(state, 'blue')).toBe('Dix – onze')
  })
})

describe('end of match', () => {
  it('announces "Jeu, set et match" with the team', () => {
    const blue = winGames(winSet(newMatch(), 'blue'), 'blue', 5)
    expect(after(play(blue, 'bbb'), 'blue')).toBe('Jeu, set et match, équipe bleue !')
    const orange = play(winSet(winSet(newMatch(), 'blue'), 'orange'), 'ooooooooo')
    expect(after(orange, 'orange')).toBe('Jeu, set et match, équipe orange !')
  })

  it('announces nothing for a point after the match is over', () => {
    const over = winSet(winSet(newMatch(), 'blue'), 'blue')
    expect(announcePoint(over, addPoint(over, 'orange'))).toBe('')
  })
})

describe('undo', () => {
  it('announces "Point annulé" followed by the current score', () => {
    expect(announceUndo(play(newMatch({ firstServer: 'blue' }), 'b'))).toBe('Point annulé. Quinze – zéro')
    expect(announceUndo(play(newMatch(), 'bbbooo'))).toBe('Point annulé. Égalité')
    expect(announceUndo(play(newMatch(), 'bbbooob'))).toBe('Point annulé. Avantage bleu')
  })

  it('announces the games when back to the start of a game', () => {
    const state = winGames(winGames(newMatch(), 'blue', 3), 'orange', 2)
    expect(announceUndo(state)).toBe('Point annulé. Trois jeux à deux pour bleu')
    expect(announceUndo(winGames(winGames(newMatch(), 'blue', 2), 'orange', 2))).toBe('Point annulé. Deux jeux partout')
  })

  it('announces "Zéro partout" at the very start of a set', () => {
    expect(announceUndo(newMatch())).toBe('Point annulé. Zéro partout')
  })

  it('announces tie-break scores', () => {
    const tiebreak = toSixAll(newMatch({ firstServer: 'blue' }))
    expect(announceUndo(tiebreak)).toBe('Point annulé. Tie-break. Zéro partout')
    expect(announceUndo(play(tiebreak, 'b'))).toBe('Point annulé. Zéro – un')
    const superTiebreak = winSet(winSet(newMatch(), 'blue'), 'orange')
    expect(announceUndo(superTiebreak)).toBe('Point annulé. Super tie-break. Zéro partout')
  })
})
