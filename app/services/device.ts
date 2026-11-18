import { KeepAwake } from '@capacitor-community/keep-awake'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { isNativePlatform } from './platform'

/**
 * Device behaviour during a match: screen kept on, landscape lock, immersive full screen.
 * Every call is best-effort: a failure is logged and never blocks the match.
 */

async function attempt(label: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch (error) {
    console.warn(`[device] ${label} failed`, error)
  }
}

/* Browser fallback for the screen: the Screen Wake Lock API, when available. */
let wakeLock: WakeLockSentinel | null = null

async function requestBrowserWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
  await attempt('wake lock', async () => {
    const lock = await navigator.wakeLock.request('screen')
    lock.addEventListener('release', () => {
      if (wakeLock === lock) wakeLock = null
    })
    wakeLock = lock
  })
}

function onVisibilityChange(): void {
  // Browsers release the wake lock when the page is hidden: take it again on return.
  if (document.visibilityState === 'visible' && wakeLock === null) void requestBrowserWakeLock()
}

export async function enterMatchMode(): Promise<void> {
  if (!isNativePlatform()) {
    document.addEventListener('visibilitychange', onVisibilityChange)
    await requestBrowserWakeLock()
    return
  }
  await Promise.all([
    attempt('keep awake', () => KeepAwake.keepAwake()),
    attempt('landscape lock', () => ScreenOrientation.lock({ orientation: 'landscape' })),
    attempt('hide system bars', () => SystemBars.hide()),
  ])
}

export async function exitMatchMode(): Promise<void> {
  if (!isNativePlatform()) {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    const lock = wakeLock
    wakeLock = null
    if (lock) await attempt('wake lock release', () => lock.release())
    return
  }
  await Promise.all([
    attempt('allow sleep', () => KeepAwake.allowSleep()),
    attempt('orientation unlock', () => ScreenOrientation.unlock()),
    attempt('show system bars', () => SystemBars.show()),
  ])
}

/** Light icons on the dark theme, dark icons on the light theme. */
export async function syncSystemBarsTheme(theme: 'dark' | 'light'): Promise<void> {
  if (!isNativePlatform()) return
  await attempt('system bars style', () =>
    SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }),
  )
}
