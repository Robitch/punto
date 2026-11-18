<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useScoring, useTagInput } from '~/composables/useScoring'
import { currentServer, displayPoints } from '~/domain/score/engine'
import type { Team } from '~/domain/score/types'
import { enterMatchMode, exitMatchMode } from '~/services/device'
import { getVoice } from '~/services/voice'
import { useMatchStore } from '~/stores/match'
import { useTagsStore } from '~/stores/tags'

useHead({ title: 'Match' })

const match = useMatchStore()
const tags = useTagsStore()
const { scorePoint, undoPoint } = useScoring()
useTagInput()

const ready = ref(false)
const menuOpen = ref(false)

onMounted(async () => {
  document.documentElement.classList.add('is-locked')
  void enterMatchMode()
  if (!match.state && !(await match.restore())) match.start()
  ready.value = true
})

const state = computed(() => match.state)
const points = computed(() => (state.value ? displayPoints(state.value) : { blue: '0', orange: '0' }))
const server = computed<Team | null>(() => (state.value && !state.value.winner ? currentServer(state.value) : null))

const banner = computed(() => {
  if (!state.value || state.value.winner) return null
  if (state.value.game.kind === 'tiebreak') return 'Tie-break'
  if (state.value.game.kind === 'superTiebreak') return 'Super tie-break'
  return null
})

function setsOf(team: Team) {
  return (state.value?.completedSets ?? []).map((set) => ({
    value: set.kind === 'set' ? set.games[team] : set.points[team],
    won: set.winner === team,
  }))
}

function flashKeyOf(team: Team): number | null {
  const event = match.lastEvent
  return event?.type === 'point' && event.team === team ? event.id : null
}

const halves = computed(() => [
  { team: match.leftTeam, side: 'left' as const },
  { team: match.rightTeam, side: 'right' as const },
])

/* "Point annulé" toast, shown briefly after each undo. */
const undoToastId = ref<number | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => match.lastEvent,
  (event) => {
    if (event?.type !== 'undo') return
    undoToastId.value = event.id
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (undoToastId.value = null), 1400)
  },
)
onBeforeUnmount(() => {
  clearTimeout(toastTimer)
  getVoice().cancel()
  void exitMatchMode()
  document.documentElement.classList.remove('is-locked')
})

async function goHome(): Promise<void> {
  match.clear()
  await navigateTo('/')
}

function endMatch(): void {
  menuOpen.value = false
  void goHome()
}
</script>

<template>
  <main class="match">
    <template v-if="ready && state">
      <TransitionGroup tag="div" name="swap" class="match__halves">
        <ScoreHalf
          v-for="half in halves"
          :key="half.team"
          :team="half.team"
          :side="half.side"
          :points="points[half.team]"
          :games="state.games[half.team]"
          :sets="setsOf(half.team)"
          :serving="server === half.team"
          :tag-status="tags.status[half.team]"
          :tag-kind="tags.kind"
          :flash-key="flashKeyOf(half.team)"
          :locked="state.winner !== null"
          @score="scorePoint(half.team)"
        />
      </TransitionGroup>

      <div class="match__top">
        <Transition name="fade">
          <p v-if="banner" :key="banner" class="banner">{{ banner }}</p>
        </Transition>
        <Transition name="fade">
          <p v-if="undoToastId !== null" :key="undoToastId" class="toast" role="status">Point annulé</p>
        </Transition>
      </div>

      <nav class="controls" aria-label="Contrôles du match">
        <button
          type="button"
          class="control"
          :disabled="!match.isUndoable"
          aria-label="Annuler le dernier point"
          title="Annuler le dernier point"
          @click="undoPoint()"
        >
          <AppIcon name="undo" />
        </button>
        <button
          type="button"
          class="control"
          aria-label="Inverser les côtés"
          title="Inverser les côtés"
          @click="match.swapSides()"
        >
          <AppIcon name="swap" />
        </button>
        <button
          type="button"
          class="control"
          :aria-expanded="menuOpen"
          aria-label="Menu"
          title="Menu"
          @click="menuOpen = !menuOpen"
        >
          <AppIcon :name="menuOpen ? 'close' : 'menu'" />
        </button>
      </nav>

      <MatchMenu v-if="menuOpen" @close="menuOpen = false" @end="endMatch" />

      <MatchResult
        v-if="state.winner"
        :state="state"
        :winner="state.winner"
        @rematch="match.rematch()"
        @home="goHome"
        @undo="undoPoint()"
      />
    </template>
  </main>
</template>

<style scoped>
.match {
  position: fixed;
  inset: 0;
  overflow: hidden;
  user-select: none;
  /* No pan or zoom gesture on the match screen; taps still work. */
  touch-action: none;
}

.match__halves {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
}

.match__halves > :first-child {
  box-shadow: inset -1px 0 0 var(--line);
}

.swap-move {
  transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.match__top {
  position: absolute;
  top: calc(clamp(10px, 4vh, 24px) + env(safe-area-inset-top));
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
}

.banner,
.toast {
  margin: 0;
  padding: 8px 18px;
  border-radius: 999px;
  white-space: nowrap;
  font-size: clamp(14px, 4.5vh, 22px);
  font-weight: 650;
}

.banner {
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--fg);
}

.toast {
  background: var(--fg);
  color: var(--bg);
  font-size: clamp(13px, 3.6vh, 17px);
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.controls {
  position: absolute;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 50%;
  display: flex;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg);
  transform: translateX(-50%);
}

.control {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.control:hover {
  background: var(--control);
  color: var(--fg);
}

.control:disabled {
  opacity: 0.35;
  cursor: default;
  background: none;
}

/*
 * Portrait is only a browser preview (the app is locked in landscape):
 * stack the halves and leave room for the banner and the controls.
 */
@media (orientation: portrait) {
  .match__halves {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .match__halves > :first-child {
    padding-top: 64px;
  }

  .match__halves > :last-child {
    padding-bottom: 76px;
  }
}
</style>
