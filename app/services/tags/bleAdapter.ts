/**
 * The subset of Bluetooth LE used by the iTag service.
 * Kept small and plugin-free so the tag logic can be tested with a fake adapter;
 * the Capacitor implementation lives in capacitorBleAdapter.ts.
 */
export interface BleScanResult {
  deviceId: string
  name: string | null
  serviceUuids: string[]
}

export interface BleAdapter {
  /** Initializes the stack and asks for the Bluetooth permissions. */
  initialize(): Promise<void>
  isEnabled(): Promise<boolean>
  /** Asks the user to turn Bluetooth on (Android system dialog). */
  requestEnable(): Promise<void>
  startScan(onResult: (result: BleScanResult) => void): Promise<void>
  stopScan(): Promise<void>
  connect(deviceId: string, onDisconnect: () => void, timeoutMs: number): Promise<void>
  disconnect(deviceId: string): Promise<void>
  startNotifications(
    deviceId: string,
    service: string,
    characteristic: string,
    onValue: (value: DataView) => void,
  ): Promise<void>
  /** Writes a single byte, with response. */
  write(deviceId: string, service: string, characteristic: string, byte: number): Promise<void>
  /** Writes a single byte, without response. */
  writeWithoutResponse(deviceId: string, service: string, characteristic: string, byte: number): Promise<void>
}
