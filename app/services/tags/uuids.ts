/**
 * Every BLE identifier used with the iTags. UUIDs and behaviour can vary between
 * iTag models: this is the only place to adapt them.
 */

/** 128-bit UUID string of a 16-bit Bluetooth SIG UUID. */
function sig(short: number): string {
  return `0000${short.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`
}

export const ITAG = {
  /** Button: one notification per press (value usually 0x01). */
  button: {
    service: sig(0xffe0),
    characteristic: sig(0xffe1),
  },
  /** Link Loss: alarm when the connection drops. Written to 0x00 on every connection. */
  linkLoss: {
    service: sig(0x1803),
    alertLevel: sig(0x2a06),
  },
  /** Immediate Alert: makes the tag beep. */
  immediateAlert: {
    service: sig(0x1802),
    alertLevel: sig(0x2a06),
  },
} as const

export const ALERT_LEVEL = {
  none: 0x00,
  high: 0x02,
} as const

/** Advertised names of the iTags seen so far ("iTAG", "iTAG            ", "Smart Tag"…). */
const ITAG_NAME = /\btag\b|itag/i

/** Whether a scan result looks like an iTag: by its name, or by the button service it advertises. */
export function isLikelyITag(name: string | null, serviceUuids: readonly string[]): boolean {
  if (serviceUuids.some((uuid) => uuid.toLowerCase() === ITAG.button.service)) return true
  return name !== null && ITAG_NAME.test(name.trim())
}
