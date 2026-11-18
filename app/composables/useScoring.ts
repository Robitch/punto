import { onBeforeUnmount, onMounted } from 'vue'
import { PressDetector } from '~/domain/input/pressDetector'
import type { Team } from '~/domain/score/types'
import { getTagService } from '~/services/tags'
import { getVoice } from '~/services/voice'
import { useMatchStore } from '~/stores/match'
import { useSettingsStore } from '~/stores/settings'
import { useTagsStore } from '~/stores/tags'

/** Scoring actions shared by the tags and the on-screen controls: update the match, then speak. */
export function useScoring() {
  const match = useMatchStore()
  const settings = useSettingsStore()

  function say(text: string | null): void {
    if (text && settings.voiceEnabled) getVoice().speak(text)
  }

  return {
    scorePoint: (team: Team) => say(match.point(team)),
    undoPoint: () => say(match.undo()),
    say,
  }
}

/**
 * Starts the tag service for the whole app lifetime (call once, from app.vue)
 * and mirrors its statuses in the tags store.
 */
export function useTagConnection(): void {
  const tags = useTagsStore()
  const service = getTagService()
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    tags.kind = service.kind
    unsubscribe = service.onStatusChange((statuses) => tags.setStatuses(statuses))
    void service.start()
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    void service.stop()
  })
}

/**
 * Scores with the tags while the calling component is mounted.
 * Every press goes through the same PressDetector: single press = point, double press = undo.
 */
export function useTagInput(): void {
  const { scorePoint, undoPoint } = useScoring()
  const service = getTagService()
  const detector = new PressDetector((gesture) => {
    if (gesture.type === 'point') scorePoint(gesture.team)
    else undoPoint()
  })
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = service.onPress((team) => detector.press(team))
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    detector.dispose()
  })
}
