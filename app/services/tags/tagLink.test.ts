import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeBleAdapter } from './fakeBleAdapter'
import { BEEP_DURATION_MS, reconnectDelay, TagLink, type LinkStatus } from './tagLink'
import { ALERT_LEVEL, ITAG } from './uuids'

/** Lets pending promises (fake adapter calls) settle without advancing timers. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0)
}

describe('TagLink', () => {
  let adapter: FakeBleAdapter
  let presses: number
  let statuses: LinkStatus[]
  let logs: string[]

  function createLink(autoReconnect = true): TagLink {
    return new TagLink(adapter, 'AA:BB', {
      autoReconnect,
      onPress: () => presses++,
      onStatus: (status) => statuses.push(status),
      log: (message) => logs.push(message),
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    adapter = new FakeBleAdapter()
    presses = 0
    statuses = []
    logs = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects, turns the link loss alarm off and listens to the button', async () => {
    const link = createLink()
    link.start()
    await settle()
    expect(adapter.connectCalls).toEqual(['AA:BB'])
    expect(adapter.writes).toContainEqual({
      deviceId: 'AA:BB',
      service: ITAG.linkLoss.service,
      characteristic: ITAG.linkLoss.alertLevel,
      byte: ALERT_LEVEL.none,
      withResponse: true,
    })
    expect(statuses).toEqual(['connecting', 'connected'])
    expect(link.status).toBe('connected')
  })

  it('reports each notification of the button as a press', async () => {
    createLink().start()
    await settle()
    adapter.press('AA:BB')
    adapter.press('AA:BB')
    expect(presses).toBe(2)
  })

  it('stays connected and logs when the link loss alarm cannot be turned off', async () => {
    adapter.failingWrites.add(`${ITAG.linkLoss.service}|${ITAG.linkLoss.alertLevel}`)
    const link = createLink()
    link.start()
    await settle()
    expect(link.status).toBe('connected')
    expect(logs.some((message) => message.includes('link loss'))).toBe(true)
  })

  it('reconnects in the background after the connection drops', async () => {
    const link = createLink()
    link.start()
    await settle()
    adapter.dropConnection('AA:BB')
    expect(link.status).toBe('disconnected')
    await vi.advanceTimersByTimeAsync(reconnectDelay(0))
    expect(adapter.connectCalls).toEqual(['AA:BB', 'AA:BB'])
    expect(link.status).toBe('connected')
    // The alarm is turned off again on every connection.
    expect(adapter.writes.filter((w) => w.service === ITAG.linkLoss.service)).toHaveLength(2)
  })

  it('backs off between failed attempts, then resets after a success', async () => {
    adapter.unreachable.add('AA:BB')
    const link = createLink()
    link.start()
    await settle()
    expect(link.status).toBe('disconnected')
    await vi.advanceTimersByTimeAsync(reconnectDelay(0))
    expect(adapter.connectCalls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(reconnectDelay(1) - 1)
    expect(adapter.connectCalls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(adapter.connectCalls).toHaveLength(3)

    adapter.unreachable.delete('AA:BB')
    await vi.advanceTimersByTimeAsync(reconnectDelay(2))
    expect(link.status).toBe('connected')

    adapter.dropConnection('AA:BB')
    await vi.advanceTimersByTimeAsync(reconnectDelay(0))
    expect(link.status).toBe('connected')
  })

  it('caps the reconnection delay', () => {
    expect(reconnectDelay(0)).toBeLessThan(reconnectDelay(3))
    expect(reconnectDelay(50)).toBe(reconnectDelay(3))
  })

  it('does not retry when auto reconnection is off', async () => {
    adapter.unreachable.add('AA:BB')
    createLink(false).start()
    await settle()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(adapter.connectCalls).toHaveLength(1)
  })

  it('starts retrying when auto reconnection is turned on later', async () => {
    const link = createLink(false)
    link.start()
    await settle()
    adapter.dropConnection('AA:BB')
    link.setAutoReconnect(true)
    await vi.advanceTimersByTimeAsync(reconnectDelay(0))
    expect(link.status).toBe('connected')
  })

  it('stop() disconnects, cancels reconnection and ignores late presses', async () => {
    const link = createLink()
    link.start()
    await settle()
    adapter.dropConnection('AA:BB')
    await link.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(adapter.connectCalls).toHaveLength(1)
    expect(adapter.disconnectCalls).toContain('AA:BB')
    expect(link.status).toBe('disconnected')
  })

  it('beeps by writing high then none on the immediate alert', async () => {
    const link = createLink()
    link.start()
    await settle()
    const beep = link.beep()
    await settle()
    const alerts = () => adapter.writes.filter((w) => w.service === ITAG.immediateAlert.service).map((w) => w.byte)
    expect(alerts()).toEqual([ALERT_LEVEL.high])
    await vi.advanceTimersByTimeAsync(BEEP_DURATION_MS)
    await beep
    expect(alerts()).toEqual([ALERT_LEVEL.high, ALERT_LEVEL.none])
  })

  it('beeps with a write with response (the tags ignore writes without response)', async () => {
    const link = createLink()
    link.start()
    await settle()
    const beep = link.beep()
    await vi.advanceTimersByTimeAsync(BEEP_DURATION_MS)
    await beep
    const alerts = adapter.writes.filter((w) => w.service === ITAG.immediateAlert.service)
    expect(alerts.map((w) => [w.byte, w.withResponse])).toEqual([
      [ALERT_LEVEL.high, true],
      [ALERT_LEVEL.none, true],
    ])
  })

  it('falls back to a write without response when the write with response fails', async () => {
    const link = createLink()
    link.start()
    await settle()
    const original = adapter.write.bind(adapter)
    adapter.write = async () => {
      throw new Error('not supported')
    }
    const beep = link.beep()
    await vi.advanceTimersByTimeAsync(BEEP_DURATION_MS)
    await beep
    adapter.write = original
    const alerts = adapter.writes.filter((w) => w.service === ITAG.immediateAlert.service)
    expect(alerts.map((w) => [w.byte, w.withResponse])).toEqual([
      [ALERT_LEVEL.high, false],
      [ALERT_LEVEL.none, false],
    ])
  })

  it('does not beep when not connected', async () => {
    adapter.unreachable.add('AA:BB')
    const link = createLink(false)
    link.start()
    await settle()
    expect(await link.beep()).toBe(false)
    expect(adapter.writes).toHaveLength(0)
  })
})
