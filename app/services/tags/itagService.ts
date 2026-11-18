import { TEAMS, type Team } from '~/domain/score/types'
import type { KeyValueStorage } from '../storage'
import type { BleAdapter } from './bleAdapter'
import { TagLink, type LinkStatus } from './tagLink'
import { TagError, type PairingListener, type TagPairing, type TagService, type TagStatus } from './TagService'
import { isLikelyITag } from './uuids'

/** Storage key of the paired tags: { blue: deviceId, orange: deviceId } (MAC addresses on Android). */
export const PAIRED_TAGS_KEY = 'pairedTags'
/** How long pairing scans for nearby tags. */
export const SCAN_DURATION_MS = 20_000

type Assignment = Readonly<Record<Team, string>>

function isAssignment(value: unknown): value is Assignment {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.blue === 'string' && typeof record.orange === 'string'
}

/** iTags over Bluetooth LE: one TagLink per team, plus temporary links while pairing. */
export function createITagService(
  adapter: BleAdapter,
  storage: KeyValueStorage,
  log: (message: string, error?: unknown) => void = (message, error) => console.warn(`[tags] ${message}`, error ?? ''),
): TagService {
  const pressListeners = new Set<(team: Team) => void>()
  const statusListeners = new Set<(statuses: Readonly<Record<Team, TagStatus>>) => void>()
  let statuses: Record<Team, TagStatus> = { blue: 'unpaired', orange: 'unpaired' }
  let paired: Assignment | null = null
  let teamLinks: Partial<Record<Team, TagLink>> = {}
  let ready: Promise<void> | null = null

  // Pairing session.
  const candidates = new Map<string, TagLink>()
  let pairingListener: PairingListener | null = null
  let scanTimer: ReturnType<typeof setTimeout> | null = null

  function setStatus(team: Team, status: TagStatus): void {
    if (statuses[team] === status) return
    statuses = { ...statuses, [team]: status }
    for (const listener of statusListeners) listener(statuses)
  }

  function emitPress(team: Team): void {
    for (const listener of pressListeners) listener(team)
  }

  function teamHandlers(team: Team) {
    return {
      onPress: () => emitPress(team),
      onStatus: (status: LinkStatus) => setStatus(team, status),
    }
  }

  function ensureReady(): Promise<void> {
    ready ??= adapter.initialize().catch((error: unknown) => {
      ready = null
      throw new TagError('permission', error)
    })
    return ready
  }

  function startTeamLinks(): void {
    if (!paired) {
      for (const team of TEAMS) setStatus(team, 'unpaired')
      return
    }
    for (const team of TEAMS) {
      const link = new TagLink(adapter, paired[team], { autoReconnect: true, log, ...teamHandlers(team) })
      teamLinks[team] = link
      link.start()
    }
  }

  async function stopTeamLinks(): Promise<void> {
    const links = Object.values(teamLinks)
    teamLinks = {}
    await Promise.all(links.map((link) => link.stop()))
  }

  async function stopScan(): Promise<void> {
    if (scanTimer !== null) clearTimeout(scanTimer)
    scanTimer = null
    await adapter.stopScan().catch(() => {})
  }

  function connectedCandidates(): number {
    return [...candidates.values()].filter((link) => link.status === 'connected').length
  }

  function addCandidate(deviceId: string): void {
    const link = new TagLink(adapter, deviceId, {
      autoReconnect: false,
      log,
      onPress: () => pairingListener?.onPress(deviceId),
      onStatus: () => pairingListener?.onCandidates(connectedCandidates()),
    })
    candidates.set(deviceId, link)
    link.start()
  }

  async function endPairingSession(keep: ReadonlySet<string> = new Set()): Promise<void> {
    pairingListener = null
    await stopScan()
    const dropped = [...candidates.values()].filter((link) => !keep.has(link.deviceId))
    candidates.clear()
    await Promise.all(dropped.map((link) => link.stop()))
  }

  const pairing: TagPairing = {
    async begin(listener) {
      if (pairingListener) await endPairingSession()
      await ensureReady()
      if (!(await adapter.isEnabled())) {
        await adapter.requestEnable().catch(() => {})
        if (!(await adapter.isEnabled())) throw new TagError('bluetooth-off')
      }
      // The paired tags must be free to be found and connected again.
      await stopTeamLinks()
      pairingListener = listener
      listener.onCandidates(0)
      await adapter.startScan((result) => {
        if (!pairingListener || candidates.has(result.deviceId)) return
        if (!isLikelyITag(result.name, result.serviceUuids)) return
        addCandidate(result.deviceId)
      })
      scanTimer = setTimeout(() => void stopScan(), SCAN_DURATION_MS)
    },

    async beep(deviceId) {
      return (await candidates.get(deviceId)?.beep()) ?? false
    },

    async finish(assignment) {
      const kept = new Map(TEAMS.map((team) => [team, candidates.get(assignment[team])] as const))
      await endPairingSession(new Set(TEAMS.map((team) => assignment[team])))
      paired = assignment
      await storage.set(PAIRED_TAGS_KEY, assignment)
      for (const team of TEAMS) {
        const link = kept.get(team)
        if (link) {
          // Already connected during pairing: keep the connection.
          link.rebind(teamHandlers(team))
          link.setAutoReconnect(true)
          teamLinks[team] = link
          setStatus(team, link.status)
        } else {
          const fresh = new TagLink(adapter, assignment[team], { autoReconnect: true, log, ...teamHandlers(team) })
          teamLinks[team] = fresh
          fresh.start()
        }
      }
    },

    async cancel() {
      await endPairingSession()
      startTeamLinks()
    },
  }

  return {
    kind: 'ble',
    pairing,

    async start() {
      const stored = await storage.get<unknown>(PAIRED_TAGS_KEY)
      paired = isAssignment(stored) ? stored : null
      // Without paired tags, the Bluetooth permission is only asked when pairing starts.
      if (paired) {
        try {
          await ensureReady()
        } catch (error) {
          log('Bluetooth unavailable', error)
        }
      }
      startTeamLinks()
    },

    async stop() {
      await endPairingSession()
      await stopTeamLinks()
    },

    onPress(listener) {
      pressListeners.add(listener)
      return () => pressListeners.delete(listener)
    },

    onStatusChange(listener) {
      statusListeners.add(listener)
      listener(statuses)
      return () => statusListeners.delete(listener)
    },

    async beep(team) {
      return (await teamLinks[team]?.beep()) ?? false
    },
  }
}
