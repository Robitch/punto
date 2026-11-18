import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEBOUNCE_MS, DOUBLE_PRESS_WINDOW_MS, PressDetector, type PressGesture } from './pressDetector'

describe('PressDetector', () => {
  let gestures: PressGesture[]
  let detector: PressDetector

  beforeEach(() => {
    vi.useFakeTimers()
    gestures = []
    detector = new PressDetector((gesture) => gestures.push(gesture))
  })

  afterEach(() => {
    detector.dispose()
    vi.useRealTimers()
  })

  it('uses a 400 ms double-press window and a 60 ms debounce by default', () => {
    expect(DOUBLE_PRESS_WINDOW_MS).toBe(400)
    expect(DEBOUNCE_MS).toBe(60)
  })

  it('validates a single press as a point once the window has elapsed', () => {
    detector.press('blue')
    expect(gestures).toEqual([])
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS - 1)
    expect(gestures).toEqual([])
    vi.advanceTimersByTime(1)
    expect(gestures).toEqual([{ type: 'point', team: 'blue' }])
  })

  it('turns two presses of the same tag within the window into an undo, without a point', () => {
    detector.press('orange')
    vi.advanceTimersByTime(200)
    detector.press('orange')
    expect(gestures).toEqual([{ type: 'undo', team: 'orange' }])
    vi.advanceTimersByTime(1000)
    expect(gestures).toEqual([{ type: 'undo', team: 'orange' }])
  })

  it('ignores bounces shorter than the debounce delay', () => {
    detector.press('blue')
    vi.advanceTimersByTime(DEBOUNCE_MS - 1)
    detector.press('blue')
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS)
    expect(gestures).toEqual([{ type: 'point', team: 'blue' }])
  })

  it('accepts a second press right at the debounce delay as a double press', () => {
    detector.press('blue')
    vi.advanceTimersByTime(DEBOUNCE_MS)
    detector.press('blue')
    expect(gestures).toEqual([{ type: 'undo', team: 'blue' }])
  })

  it('counts two presses further apart than the window as two points', () => {
    detector.press('blue')
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS + 50)
    detector.press('blue')
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS)
    expect(gestures).toEqual([
      { type: 'point', team: 'blue' },
      { type: 'point', team: 'blue' },
    ])
  })

  it('validates the pending point immediately when the other tag is pressed', () => {
    detector.press('blue')
    vi.advanceTimersByTime(100)
    detector.press('orange')
    expect(gestures).toEqual([{ type: 'point', team: 'blue' }])
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS)
    expect(gestures).toEqual([
      { type: 'point', team: 'blue' },
      { type: 'point', team: 'orange' },
    ])
  })

  it('does not treat presses from two different tags as a double press', () => {
    detector.press('blue')
    vi.advanceTimersByTime(50)
    detector.press('orange')
    vi.advanceTimersByTime(100)
    detector.press('orange')
    expect(gestures).toEqual([
      { type: 'point', team: 'blue' },
      { type: 'undo', team: 'orange' },
    ])
  })

  it('treats a triple press as an undo followed by a new pending press', () => {
    detector.press('blue')
    vi.advanceTimersByTime(100)
    detector.press('blue')
    vi.advanceTimersByTime(100)
    detector.press('blue')
    expect(gestures).toEqual([{ type: 'undo', team: 'blue' }])
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS)
    expect(gestures).toEqual([
      { type: 'undo', team: 'blue' },
      { type: 'point', team: 'blue' },
    ])
  })

  it('supports custom delays', () => {
    const custom: PressGesture[] = []
    const d = new PressDetector((g) => custom.push(g), { doublePressWindowMs: 250, debounceMs: 20 })
    d.press('blue')
    vi.advanceTimersByTime(30)
    d.press('blue')
    expect(custom).toEqual([{ type: 'undo', team: 'blue' }])
    d.press('orange')
    vi.advanceTimersByTime(250)
    expect(custom).toEqual([
      { type: 'undo', team: 'blue' },
      { type: 'point', team: 'orange' },
    ])
    d.dispose()
  })

  it('dispose() drops a pending press without emitting it', () => {
    detector.press('blue')
    detector.dispose()
    vi.advanceTimersByTime(DOUBLE_PRESS_WINDOW_MS * 2)
    expect(gestures).toEqual([])
  })
})
