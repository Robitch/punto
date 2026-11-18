import { describe, expect, it } from 'vitest'
import { scoreLine } from './summary'
import { newMatch, play, toSixAll, winGames, winSet } from './testUtils'

describe('scoreLine', () => {
  it('shows only the current set at the start of a match', () => {
    expect(scoreLine(newMatch())).toEqual([{ blue: 0, orange: 0, current: true }])
  })

  it('lists completed sets, then the current set games', () => {
    let state = winGames(winGames(newMatch(), 'blue', 6), 'orange', 0)
    state = winGames(winGames(state, 'orange', 1), 'blue', 2)
    expect(scoreLine(state)).toEqual([
      { blue: 6, orange: 0, current: false },
      { blue: 2, orange: 1, current: true },
    ])
  })

  it('shows a tie-break set as 7-6', () => {
    const state = play(toSixAll(newMatch()), 'ooooooo')
    expect(scoreLine(state)[0]).toEqual({ blue: 6, orange: 7, current: false })
  })

  it('shows the super tie-break points as the third set', () => {
    const state = play(winSet(winSet(newMatch(), 'blue'), 'orange'), 'bbbo')
    expect(scoreLine(state)[2]).toEqual({ blue: 3, orange: 1, current: true })
  })

  it('has no current set once the match is over', () => {
    const state = winSet(winSet(newMatch(), 'blue'), 'blue')
    expect(scoreLine(state)).toEqual([
      { blue: 6, orange: 0, current: false },
      { blue: 6, orange: 0, current: false },
    ])
  })
})
