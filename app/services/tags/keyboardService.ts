import type { Team } from '~/domain/score/types'
import type { TagService, TagStatus } from './TagService'

/** Keys simulating each team's tag in the browser. */
export const KEY_BINDINGS: Readonly<Record<Team, string>> = { blue: 'a', orange: 'l' }

/** Browser simulation of the two iTags: key A = blue, key L = orange. */
export function createKeyboardService(): TagService {
  const pressListeners = new Set<(team: Team) => void>()
  const statusListeners = new Set<(statuses: Readonly<Record<Team, TagStatus>>) => void>()
  let statuses: Record<Team, TagStatus> = { blue: 'disconnected', orange: 'disconnected' }

  function setStatuses(next: Record<Team, TagStatus>): void {
    statuses = next
    for (const listener of statusListeners) listener(statuses)
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    const target = event.target
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
      return
    }
    const key = event.key.toLowerCase()
    const team = (Object.keys(KEY_BINDINGS) as Team[]).find((t) => KEY_BINDINGS[t] === key)
    if (!team) return
    event.preventDefault()
    for (const listener of pressListeners) listener(team)
  }

  return {
    kind: 'keyboard',
    async start() {
      window.addEventListener('keydown', onKeyDown)
      setStatuses({ blue: 'connected', orange: 'connected' })
    },
    async stop() {
      window.removeEventListener('keydown', onKeyDown)
      setStatuses({ blue: 'disconnected', orange: 'disconnected' })
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
    // Keys cannot beep, and there is nothing to pair.
    async beep() {
      return false
    },
    pairing: null,
  }
}
