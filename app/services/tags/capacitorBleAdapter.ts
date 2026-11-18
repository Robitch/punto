import { BleClient, numbersToDataView, ScanMode } from '@capacitor-community/bluetooth-le'
import type { BleAdapter } from './bleAdapter'

/** BleAdapter on top of @capacitor-community/bluetooth-le (Android). */
export function createCapacitorBleAdapter(): BleAdapter {
  return {
    // Scan results are never used for location (see AndroidManifest.xml).
    initialize: () => BleClient.initialize({ androidNeverForLocation: true }),
    isEnabled: () => BleClient.isEnabled(),
    requestEnable: () => BleClient.requestEnable(),

    startScan: (onResult) =>
      BleClient.requestLEScan({ scanMode: ScanMode.SCAN_MODE_LOW_LATENCY }, (result) =>
        onResult({
          deviceId: result.device.deviceId,
          name: result.localName ?? result.device.name ?? null,
          serviceUuids: result.uuids ?? [],
        }),
      ),
    stopScan: () => BleClient.stopLEScan(),

    connect: (deviceId, onDisconnect, timeoutMs) => BleClient.connect(deviceId, () => onDisconnect(), { timeout: timeoutMs }),
    disconnect: (deviceId) => BleClient.disconnect(deviceId),

    startNotifications: (deviceId, service, characteristic, onValue) =>
      BleClient.startNotifications(deviceId, service, characteristic, onValue),

    write: (deviceId, service, characteristic, byte) =>
      BleClient.write(deviceId, service, characteristic, numbersToDataView([byte])),
    writeWithoutResponse: (deviceId, service, characteristic, byte) =>
      BleClient.writeWithoutResponse(deviceId, service, characteristic, numbersToDataView([byte])),
  }
}
