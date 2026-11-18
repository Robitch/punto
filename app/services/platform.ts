import { Capacitor } from '@capacitor/core'

/** True inside the Android app, false in the browser. The single source for platform checks. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}
