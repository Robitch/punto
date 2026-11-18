import { describe, expect, it } from 'vitest'
import { ITAG, isLikelyITag } from './uuids'

describe('iTag identifiers', () => {
  it('uses the documented UUIDs', () => {
    expect(ITAG.button.service).toBe('0000ffe0-0000-1000-8000-00805f9b34fb')
    expect(ITAG.button.characteristic).toBe('0000ffe1-0000-1000-8000-00805f9b34fb')
    expect(ITAG.linkLoss.service).toBe('00001803-0000-1000-8000-00805f9b34fb')
    expect(ITAG.immediateAlert.service).toBe('00001802-0000-1000-8000-00805f9b34fb')
    expect(ITAG.linkLoss.alertLevel).toBe('00002a06-0000-1000-8000-00805f9b34fb')
  })
})

describe('isLikelyITag', () => {
  it.each(['iTAG', 'iTAG            ', 'ITAG', 'Smart Tag', 'tag'])('accepts the name "%s"', (name) => {
    expect(isLikelyITag(name, [])).toBe(true)
  })

  it.each(['Galaxy Buds', 'Mi Band 7', 'Vintage speaker', ''])('rejects the name "%s"', (name) => {
    expect(isLikelyITag(name, [])).toBe(false)
  })

  it('accepts an unnamed device advertising the button service', () => {
    expect(isLikelyITag(null, ['0000FFE0-0000-1000-8000-00805F9B34FB'])).toBe(true)
  })

  it('rejects an unnamed device without the button service', () => {
    expect(isLikelyITag(null, ['0000180d-0000-1000-8000-00805f9b34fb'])).toBe(false)
  })
})
