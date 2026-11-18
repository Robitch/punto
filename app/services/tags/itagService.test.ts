import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Team } from '~/domain/score/types'
import type { KeyValueStorage } from '../storage'
import { FakeBleAdapter } from './fakeBleAdapter'
import { createITagService, PAIRED_TAGS_KEY, SCAN_DURATION_MS } from './itagService'
import { reconnectDelay } from './tagLink'
import { TagError, type TagService, type TagStatus } from './TagService'

function memoryStorage(initial: Record<string, unknown> = {}): KeyValueStorage & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = { ...initial }
  return {
    data,
    async get<T>(key: string) {
      return (data[key] as T | undefined) ?? null
    },
    async set(key, value) {
      data[key] = value
    },
    async remove(key) {
      delete data[key]
    },
  }
}

const ITAG_AD = (deviceId: string) => ({ deviceId, name: 'iTAG', serviceUuids: [] })

describe('iTag service', () => {
  let adapter: FakeBleAdapter
  let presses: Team[]
  let statuses: Array<Readonly<Record<Team, TagStatus>>>

  async function startService(storage: KeyValueStorage): Promise<TagService> {
    const service = createITagService(adapter, storage, () => {})
    service.onPress((team) => presses.push(team))
    service.onStatusChange((s) => statuses.push(s))
    await service.start()
    await vi.advanceTimersByTimeAsync(0)
    return service
  }

  const lastStatus = () => statuses[statuses.length - 1]

  beforeEach(() => {
    vi.useFakeTimers()
    adapter = new FakeBleAdapter()
    presses = []
    statuses = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports both tags as unpaired when nothing is saved', async () => {
    await startService(memoryStorage())
    expect(lastStatus()).toEqual({ blue: 'unpaired', orange: 'unpaired' })
    expect(adapter.connectCalls).toEqual([])
  })

  it('reconnects automatically to the saved tags on start', async () => {
    await startService(memoryStorage({ [PAIRED_TAGS_KEY]: { blue: 'B1', orange: 'O1' } }))
    expect(adapter.connectCalls.sort()).toEqual(['B1', 'O1'])
    expect(lastStatus()).toEqual({ blue: 'connected', orange: 'connected' })
  })

  it('maps each tag press to its team', async () => {
    await startService(memoryStorage({ [PAIRED_TAGS_KEY]: { blue: 'B1', orange: 'O1' } }))
    adapter.press('O1')
    adapter.press('B1')
    expect(presses).toEqual(['orange', 'blue'])
  })

  it('reports a dropped tag as disconnected and reconnects it in the background', async () => {
    await startService(memoryStorage({ [PAIRED_TAGS_KEY]: { blue: 'B1', orange: 'O1' } }))
    adapter.dropConnection('B1')
    expect(lastStatus()).toEqual({ blue: 'disconnected', orange: 'connected' })
    await vi.advanceTimersByTimeAsync(reconnectDelay(0))
    expect(lastStatus()).toEqual({ blue: 'connected', orange: 'connected' })
  })

  it('beeps the team tag', async () => {
    const service = await startService(memoryStorage({ [PAIRED_TAGS_KEY]: { blue: 'B1', orange: 'O1' } }))
    const beep = service.beep('orange')
    await vi.advanceTimersByTimeAsync(5000)
    expect(await beep).toBe(true)
    expect(adapter.writes.some((w) => w.deviceId === 'O1' && w.byte === 0x02)).toBe(true)
  })

  describe('pairing', () => {
    it('fails with bluetooth-off when Bluetooth stays off', async () => {
      adapter.enabled = false
      const service = await startService(memoryStorage())
      await expect(service.pairing!.begin({ onCandidates() {}, onPress() {} })).rejects.toEqual(
        new TagError('bluetooth-off'),
      )
    })

    it('connects only to the nearby devices that look like iTags', async () => {
      const service = await startService(memoryStorage())
      const counts: number[] = []
      await service.pairing!.begin({ onCandidates: (n) => counts.push(n), onPress() {} })
      adapter.advertise(ITAG_AD('T1'))
      adapter.advertise({ deviceId: 'X', name: 'Galaxy Buds', serviceUuids: [] })
      adapter.advertise(ITAG_AD('T2'))
      adapter.advertise(ITAG_AD('T1'))
      await vi.advanceTimersByTimeAsync(0)
      expect(adapter.connectCalls).toEqual(['T1', 'T2'])
      expect(counts[counts.length - 1]).toBe(2)
    })

    it('reports presses of nearby tags with their id, not as points', async () => {
      const service = await startService(memoryStorage())
      const pressed: string[] = []
      await service.pairing!.begin({ onCandidates() {}, onPress: (id) => pressed.push(id) })
      adapter.advertise(ITAG_AD('T1'))
      await vi.advanceTimersByTimeAsync(0)
      adapter.press('T1')
      expect(pressed).toEqual(['T1'])
      expect(presses).toEqual([])
    })

    it('stops scanning after a while', async () => {
      const service = await startService(memoryStorage())
      await service.pairing!.begin({ onCandidates() {}, onPress() {} })
      expect(adapter.scanning).toBe(true)
      await vi.advanceTimersByTimeAsync(SCAN_DURATION_MS)
      expect(adapter.scanning).toBe(false)
    })

    it('finish saves the tags, keeps them connected as team tags and drops the others', async () => {
      const storage = memoryStorage()
      const service = await startService(storage)
      await service.pairing!.begin({ onCandidates() {}, onPress() {} })
      for (const id of ['T1', 'T2', 'T3']) adapter.advertise(ITAG_AD(id))
      await vi.advanceTimersByTimeAsync(0)

      await service.pairing!.finish({ blue: 'T2', orange: 'T1' })
      expect(storage.data[PAIRED_TAGS_KEY]).toEqual({ blue: 'T2', orange: 'T1' })
      expect(adapter.scanning).toBe(false)
      expect(adapter.isConnected('T3')).toBe(false)
      expect(adapter.connectCalls.filter((id) => id === 'T2')).toHaveLength(1)
      expect(lastStatus()).toEqual({ blue: 'connected', orange: 'connected' })

      adapter.press('T1')
      expect(presses).toEqual(['orange'])

      // Team tags reconnect automatically after pairing.
      adapter.dropConnection('T2')
      await vi.advanceTimersByTimeAsync(reconnectDelay(0))
      expect(lastStatus()?.blue).toBe('connected')
    })

    it('cancel goes back to the previously paired tags', async () => {
      const service = await startService(memoryStorage({ [PAIRED_TAGS_KEY]: { blue: 'B1', orange: 'O1' } }))
      await service.pairing!.begin({ onCandidates() {}, onPress() {} })
      expect(adapter.isConnected('B1')).toBe(false)
      adapter.advertise(ITAG_AD('T9'))
      await vi.advanceTimersByTimeAsync(0)

      await service.pairing!.cancel()
      await vi.advanceTimersByTimeAsync(0)
      expect(adapter.isConnected('T9')).toBe(false)
      expect(adapter.isConnected('B1')).toBe(true)
      expect(lastStatus()).toEqual({ blue: 'connected', orange: 'connected' })
    })
  })
})
