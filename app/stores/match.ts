import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { announcePoint, announceUndo } from '~/domain/score/announce'
import { addPoint, createMatch } from '~/domain/score/engine'
import { canUndo, currentState, pushState, startHistory, undo as undoHistory, type MatchHistory } from '~/domain/score/history'
import { DEFAULT_SETTINGS, otherTeam, type MatchSettings, type Team } from '~/domain/score/types'
import { storage } from '~/services/storage'

const STORAGE_KEY = 'currentMatch'
const STORAGE_VERSION = 1

interface StoredMatch {
  version: number
  history: MatchHistory
  leftTeam: Team
}

/** Last scoring event, used by the UI for visual feedback. `id` changes on every event. */
export type MatchEvent = { id: number; type: 'point'; team: Team } | { id: number; type: 'undo' }

export const useMatchStore = defineStore('match', () => {
  const history = shallowRef<MatchHistory | null>(null)
  const leftTeam = ref<Team>('blue')
  const lastEvent = shallowRef<MatchEvent | null>(null)
  let eventId = 0

  const state = computed(() => (history.value ? currentState(history.value) : null))
  const isUndoable = computed(() => (history.value ? canUndo(history.value) : false))
  const rightTeam = computed(() => otherTeam(leftTeam.value))

  function persist(): void {
    if (!history.value) {
      void storage.remove(STORAGE_KEY)
      return
    }
    const stored: StoredMatch = { version: STORAGE_VERSION, history: history.value, leftTeam: leftTeam.value }
    void storage.set(STORAGE_KEY, stored)
  }

  function start(settings: MatchSettings = DEFAULT_SETTINGS): void {
    history.value = startHistory(createMatch(settings))
    lastEvent.value = null
    persist()
  }

  /** Restores the match saved locally, if any. */
  async function restore(): Promise<boolean> {
    const stored = await storage.get<StoredMatch>(STORAGE_KEY)
    if (!stored || stored.version !== STORAGE_VERSION || !Array.isArray(stored.history) || stored.history.length === 0) {
      return false
    }
    history.value = stored.history
    leftTeam.value = stored.leftTeam === 'orange' ? 'orange' : 'blue'
    return true
  }

  /** Adds a point. Returns the text to announce, or null if nothing changed. */
  function point(team: Team): string | null {
    if (!history.value) return null
    const prev = currentState(history.value)
    const next = addPoint(prev, team)
    if (next === prev) return null
    history.value = pushState(history.value, next)
    lastEvent.value = { id: ++eventId, type: 'point', team }
    persist()
    return announcePoint(prev, next)
  }

  /** Cancels the last point. Returns the text to announce, or null if there was nothing to undo. */
  function undo(): string | null {
    if (!history.value || !canUndo(history.value)) return null
    history.value = undoHistory(history.value)
    lastEvent.value = { id: ++eventId, type: 'undo' }
    persist()
    return announceUndo(currentState(history.value))
  }

  /** New match with the same settings, the other team serving first. */
  function rematch(): void {
    if (!state.value) return
    const settings = state.value.settings
    start({ ...settings, firstServer: otherTeam(settings.firstServer) })
  }

  function swapSides(): void {
    leftTeam.value = otherTeam(leftTeam.value)
    persist()
  }

  function clear(): void {
    history.value = null
    lastEvent.value = null
    persist()
  }

  return { history, state, leftTeam, rightTeam, lastEvent, isUndoable, start, restore, point, undo, rematch, swapSides, clear }
})
