import type { BleAdapter } from './bleAdapter'
import { ALERT_LEVEL, BEEP_LEVEL, ITAG } from './uuids'

export type LinkStatus = 'connecting' | 'connected' | 'disconnected'

/** Delays between reconnection attempts; the last one repeats. */
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10_000] as const
export const CONNECT_TIMEOUT_MS = 8000
/** How long the tag beeps when asked to (between the BEEP_LEVEL and 0x00 writes). */
export const BEEP_DURATION_MS = 1200

export function reconnectDelay(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), RECONNECT_DELAYS_MS.length - 1)
  return RECONNECT_DELAYS_MS[index] ?? 10_000
}

export interface TagLinkOptions {
  /** Keep trying to reconnect when the connection fails or drops. */
  autoReconnect: boolean
  onPress: () => void
  onStatus: (status: LinkStatus) => void
  log?: (message: string, error?: unknown) => void
}

/**
 * Connection to one iTag: connects, turns its link loss alarm off, listens to the button,
 * and reconnects in the background (with a growing delay) when the link drops.
 */
export class TagLink {
  status: LinkStatus = 'disconnected'
  private autoReconnect: boolean
  private running = false
  /** Incremented on start/stop: callbacks from an older session are ignored. */
  private session = 0
  private attempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly adapter: BleAdapter,
    readonly deviceId: string,
    private readonly options: TagLinkOptions,
  ) {
    this.autoReconnect = options.autoReconnect
    this.pressHandler = options.onPress
    this.statusHandler = options.onStatus
  }

  /** Replaces the handlers, keeping the connection (a pairing candidate becoming a team tag). */
  rebind(handlers: Pick<TagLinkOptions, 'onPress' | 'onStatus'>): void {
    this.pressHandler = handlers.onPress
    this.statusHandler = handlers.onStatus
  }

  private pressHandler: () => void
  private statusHandler: (status: LinkStatus) => void

  start(): void {
    if (this.running) return
    this.running = true
    this.attempt = 0
    const session = ++this.session
    void this.connect(session)
  }

  async stop(): Promise<void> {
    this.running = false
    this.session++
    this.clearRetry()
    this.setStatus('disconnected')
    try {
      await this.adapter.disconnect(this.deviceId)
    } catch {
      // Already disconnected.
    }
  }

  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled
    if (enabled && this.running && this.status === 'disconnected' && this.retryTimer === null) {
      this.scheduleRetry(this.session)
    }
    if (!enabled) this.clearRetry()
  }

  /** Makes the tag beep briefly. Returns false if the tag is not connected. */
  async beep(): Promise<boolean> {
    if (this.status !== 'connected') return false
    const { service, alertLevel } = ITAG.immediateAlert
    try {
      await this.writeAny(service, alertLevel, BEEP_LEVEL)
      await new Promise((resolve) => setTimeout(resolve, BEEP_DURATION_MS))
      await this.writeAny(service, alertLevel, ALERT_LEVEL.none)
      return true
    } catch (error) {
      this.log('beep failed', error)
      return false
    }
  }

  private isCurrent(session: number): boolean {
    return this.running && session === this.session
  }

  private async connect(session: number): Promise<void> {
    if (!this.isCurrent(session)) return
    this.setStatus('connecting')
    try {
      await this.adapter.connect(this.deviceId, () => this.handleDisconnect(session), CONNECT_TIMEOUT_MS)
      if (!this.isCurrent(session)) return
      await this.disableLinkLossAlarm()
      const { service, characteristic } = ITAG.button
      await this.adapter.startNotifications(this.deviceId, service, characteristic, () => {
        if (this.isCurrent(session)) this.pressHandler()
      })
      if (!this.isCurrent(session)) return
      this.attempt = 0
      this.setStatus('connected')
    } catch (error) {
      if (!this.isCurrent(session)) return
      this.log('connection failed', error)
      await this.adapter.disconnect(this.deviceId).catch(() => {})
      this.setStatus('disconnected')
      this.scheduleRetry(session)
    }
  }

  private handleDisconnect(session: number): void {
    if (!this.isCurrent(session)) return
    this.setStatus('disconnected')
    this.scheduleRetry(session)
  }

  private scheduleRetry(session: number): void {
    this.clearRetry()
    if (!this.autoReconnect || !this.isCurrent(session)) return
    const delay = reconnectDelay(this.attempt++)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.connect(session)
    }, delay)
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  /** The tags beep loudly when the link drops: turn that alarm off. Never fatal. */
  private async disableLinkLossAlarm(): Promise<void> {
    const { service, alertLevel } = ITAG.linkLoss
    try {
      await this.adapter.write(this.deviceId, service, alertLevel, ALERT_LEVEL.none)
    } catch (error) {
      try {
        await this.adapter.writeWithoutResponse(this.deviceId, service, alertLevel, ALERT_LEVEL.none)
      } catch {
        this.log('link loss alarm could not be turned off (fallback: remove the buzzer)', error)
      }
    }
  }

  /**
   * Write with response first: the iTags tested silently ignore a "write without response"
   * on Immediate Alert even though they advertise it. Without response is only a fallback.
   */
  private async writeAny(service: string, characteristic: string, byte: number): Promise<void> {
    try {
      await this.adapter.write(this.deviceId, service, characteristic, byte)
    } catch {
      await this.adapter.writeWithoutResponse(this.deviceId, service, characteristic, byte)
    }
  }

  private setStatus(status: LinkStatus): void {
    if (this.status === status) return
    this.status = status
    this.statusHandler(status)
  }

  private log(message: string, error?: unknown): void {
    if (this.options.log) this.options.log(message, error)
    else console.warn(`[tag ${this.deviceId}] ${message}`, error ?? '')
  }
}
