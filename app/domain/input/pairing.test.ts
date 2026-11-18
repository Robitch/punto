import { describe, expect, it } from 'vitest'
import { pairingPress, startPairing } from './pairing'

describe('pairing', () => {
  it('starts by asking for the blue tag', () => {
    expect(startPairing()).toEqual({ step: 'blue', assigned: {}, rejected: null })
  })

  it('assigns the first pressed tag to blue, then the next one to orange', () => {
    const afterBlue = pairingPress(startPairing(), 'AA')
    expect(afterBlue).toEqual({ step: 'orange', assigned: { blue: 'AA' }, rejected: null })
    const done = pairingPress(afterBlue, 'BB')
    expect(done).toEqual({ step: 'done', assigned: { blue: 'AA', orange: 'BB' }, rejected: null })
  })

  it('rejects the blue tag when orange is expected', () => {
    const afterBlue = pairingPress(startPairing(), 'AA')
    const again = pairingPress(afterBlue, 'AA')
    expect(again).toEqual({ step: 'orange', assigned: { blue: 'AA' }, rejected: 'AA' })
    expect(pairingPress(again, 'BB').rejected).toBeNull()
  })

  it('ignores presses once both tags are assigned', () => {
    const done = pairingPress(pairingPress(startPairing(), 'AA'), 'BB')
    expect(pairingPress(done, 'CC')).toBe(done)
  })

  it('never mutates the previous state', () => {
    const start = Object.freeze(startPairing())
    pairingPress(start, 'AA')
    expect(start).toEqual({ step: 'blue', assigned: {}, rejected: null })
  })
})
