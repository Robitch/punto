import { describe, expect, it } from 'vitest'
import { addPoint } from './engine'
import { canUndo, currentState, pushState, startHistory, undo } from './history'
import { newMatch, play, toSixAll, winSet } from './testUtils'

describe('history', () => {
  it('starts with the initial state and nothing to undo', () => {
    const initial = newMatch()
    const history = startHistory(initial)
    expect(currentState(history)).toBe(initial)
    expect(canUndo(history)).toBe(false)
  })

  it('undo returns exactly to the previous state', () => {
    const s0 = play(newMatch(), 'bbo')
    const s1 = addPoint(s0, 'blue')
    const history = pushState(startHistory(s0), s1)
    expect(canUndo(history)).toBe(true)
    expect(currentState(undo(history))).toBe(s0)
  })

  it('undo with nothing to undo returns the same history', () => {
    const history = startHistory(newMatch())
    expect(undo(history)).toBe(history)
  })

  it('pushing the same state (point ignored) does not grow the history', () => {
    const over = winSet(winSet(newMatch(), 'blue'), 'blue')
    const history = startHistory(over)
    expect(pushState(history, addPoint(over, 'orange'))).toBe(history)
  })

  it('can undo several points in a row', () => {
    let history = startHistory(newMatch())
    const states = [currentState(history)]
    for (const team of ['blue', 'orange', 'blue', 'blue'] as const) {
      const next = addPoint(currentState(history), team)
      states.push(next)
      history = pushState(history, next)
    }
    for (let i = states.length - 2; i >= 0; i--) {
      history = undo(history)
      expect(currentState(history)).toBe(states[i])
    }
    expect(canUndo(history)).toBe(false)
  })

  it.each([
    ['a game', play(newMatch(), 'bbb'), 'blue'],
    ['a set (via tie-break)', play(toSixAll(newMatch()), 'bbbbbb'), 'blue'],
    ['the match', play(winSet(winSet(newMatch(), 'blue'), 'orange'), 'b'.repeat(9)), 'blue'],
  ] as const)('undoes the point that won %s', (_label, before, team) => {
    const after = addPoint(before, team)
    expect(after).not.toEqual(before)
    const history = undo(pushState(startHistory(before), after))
    expect(currentState(history)).toEqual(before)
    expect(currentState(history).winner).toBeNull()
  })

  it('the history is not mutated', () => {
    const history = startHistory(newMatch())
    const pushed = pushState(history, addPoint(currentState(history), 'blue'))
    expect(history).toHaveLength(1)
    expect(pushed).toHaveLength(2)
    undo(pushed)
    expect(pushed).toHaveLength(2)
  })
})
