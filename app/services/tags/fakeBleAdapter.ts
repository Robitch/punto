import type { BleAdapter, BleScanResult } from './bleAdapter'

/** In-memory BleAdapter for tests: records every call and lets the test drive the devices. */
export interface FakeWrite {
  deviceId: string
  service: string
  characteristic: string
  byte: number
  withResponse: boolean
}

export class FakeBleAdapter implements BleAdapter {
  enabled = true
  readonly connectCalls: string[] = []
  readonly disconnectCalls: string[] = []
  readonly writes: FakeWrite[] = []
  /** Devices that refuse connections (connect rejects). */
  readonly unreachable = new Set<string>()
  /** Characteristics whose writes fail, as `service|characteristic`. */
  readonly failingWrites = new Set<string>()
  scanning = false

  private readonly disconnectHandlers = new Map<string, () => void>()
  private readonly notificationHandlers = new Map<string, (value: DataView) => void>()
  private scanCallback: ((result: BleScanResult) => void) | null = null

  async initialize(): Promise<void> {}

  async isEnabled(): Promise<boolean> {
    return this.enabled
  }

  async requestEnable(): Promise<void> {}

  async startScan(onResult: (result: BleScanResult) => void): Promise<void> {
    this.scanning = true
    this.scanCallback = onResult
  }

  async stopScan(): Promise<void> {
    this.scanning = false
    this.scanCallback = null
  }

  async connect(deviceId: string, onDisconnect: () => void): Promise<void> {
    this.connectCalls.push(deviceId)
    if (this.unreachable.has(deviceId)) throw new Error(`cannot reach ${deviceId}`)
    this.disconnectHandlers.set(deviceId, onDisconnect)
  }

  async disconnect(deviceId: string): Promise<void> {
    this.disconnectCalls.push(deviceId)
    this.disconnectHandlers.delete(deviceId)
    this.notificationHandlers.delete(deviceId)
  }

  async startNotifications(
    deviceId: string,
    _service: string,
    _characteristic: string,
    onValue: (value: DataView) => void,
  ): Promise<void> {
    this.notificationHandlers.set(deviceId, onValue)
  }

  async write(deviceId: string, service: string, characteristic: string, byte: number): Promise<void> {
    this.record(deviceId, service, characteristic, byte, true)
  }

  async writeWithoutResponse(deviceId: string, service: string, characteristic: string, byte: number): Promise<void> {
    this.record(deviceId, service, characteristic, byte, false)
  }

  /* Test helpers */

  /** Simulates a button press on a connected tag. */
  press(deviceId: string): void {
    this.notificationHandlers.get(deviceId)?.(new DataView(new Uint8Array([1]).buffer))
  }

  /** Simulates the tag going out of range or being switched off. */
  dropConnection(deviceId: string): void {
    const handler = this.disconnectHandlers.get(deviceId)
    this.disconnectHandlers.delete(deviceId)
    this.notificationHandlers.delete(deviceId)
    handler?.()
  }

  /** Simulates an advertisement received during a scan. */
  advertise(result: BleScanResult): void {
    this.scanCallback?.(result)
  }

  isConnected(deviceId: string): boolean {
    return this.disconnectHandlers.has(deviceId)
  }

  private record(deviceId: string, service: string, characteristic: string, byte: number, withResponse: boolean): void {
    if (this.failingWrites.has(`${service}|${characteristic}`)) throw new Error('write failed')
    this.writes.push({ deviceId, service, characteristic, byte, withResponse })
  }
}
