<script setup lang="ts">
import { computed } from 'vue'
import type { Team } from '~/domain/score/types'
import type { TagServiceKind, TagStatus } from '~/services/tags/TagService'
import { KEY_BINDINGS } from '~/services/tags/keyboardService'

const props = defineProps<{
  team: Team
  side: 'left' | 'right'
  points: string
  games: number
  /** Games (or super tie-break points) of each completed set for this team. */
  sets: ReadonlyArray<{ value: number; won: boolean }>
  serving: boolean
  tagStatus: TagStatus
  tagKind: TagServiceKind
  /** Changes on every point scored by this team, to replay the feedback animation. */
  flashKey: number | null
  locked: boolean
  /** The +1 button is shown or hidden with the other match controls. */
  controlsVisible: boolean
}>()

defineEmits<{ score: [] }>()

const TEAM_LABEL: Record<Team, string> = { blue: 'Bleu', orange: 'Orange' }
const TEAM_FULL: Record<Team, string> = { blue: 'l’équipe bleue', orange: 'l’équipe orange' }

/**
 * Sets mirrored around the net: on the right half the most recent set is the closest
 * to the centre line, so each pair of set scores sits at the same distance from it.
 */
const displayedSets = computed(() => (props.side === 'right' ? [...props.sets].reverse() : props.sets))

/** Short status text: hidden when everything is fine, explicit when a tag needs attention. */
const tagLabel = computed(() => {
  if (props.tagKind === 'keyboard') return KEY_BINDINGS[props.team].toUpperCase()
  switch (props.tagStatus) {
    case 'connected':
      return ''
    case 'connecting':
      return 'Connexion du tag…'
    case 'disconnected':
      return 'Tag déconnecté'
    case 'unpaired':
      return 'Tag non appairé'
  }
  return ''
})

const tagTitle = computed(() =>
  props.tagKind === 'keyboard'
    ? `Tag simulé : touche ${KEY_BINDINGS[props.team].toUpperCase()}`
    : tagLabel.value || 'Tag connecté',
)
</script>

<template>
  <section
    class="half"
    :class="[`half--${side}`, `half--${team}`, { 'half--serving': serving }]"
    :aria-label="team === 'blue' ? 'Équipe bleue' : 'Équipe orange'"
  >
    <div v-if="flashKey !== null" :key="flashKey" class="half__flash" aria-hidden="true" />

    <!-- Head: team name on the outer edge, games and sets towards the net (centre line). -->
    <header class="half__head">
      <p class="team">
        <span>{{ TEAM_LABEL[team] }}</span>
        <span class="tag" :class="`tag--${tagStatus}`" :title="tagTitle" role="status" :aria-label="tagTitle">
          <span class="tag__dot" aria-hidden="true" />
          <kbd v-if="tagKind === 'keyboard'" class="tag__key">{{ tagLabel }}</kbd>
        </span>
        <span v-if="tagKind === 'ble' && tagLabel" class="team__alert">{{ tagLabel }}</span>
      </p>
      <div class="tally">
        <div v-if="sets.length" class="tally__group">
          <ol class="sets" aria-label="Sets terminés">
            <li v-for="(set, i) in displayedSets" :key="i" :class="{ 'sets__item--won': set.won }">
              {{ set.value }}
            </li>
          </ol>
          <span class="tally__label">{{ sets.length > 1 ? 'sets' : 'set' }}</span>
        </div>
        <div class="tally__group">
          <span class="games">{{ games }}</span>
          <span class="tally__label">{{ games > 1 ? 'jeux' : 'jeu' }}</span>
        </div>
      </div>
    </header>

    <div class="score">
      <div class="score__inner">
        <p class="points" aria-live="polite">
          <span :key="flashKey ?? 'initial'" class="points__value">{{ points }}</span>
        </p>
        <!-- Service: the server's score is underlined. Always in the layout, so the score never moves. -->
        <span
          class="serve-bar"
          :class="{ 'serve-bar--on': serving }"
          :role="serving ? 'img' : undefined"
          :aria-label="serving ? 'Au service' : undefined"
          :aria-hidden="serving ? undefined : 'true'"
        />
      </div>
    </div>

    <!-- Overlaid in the outer bottom corner: shown with the other match controls. -->
    <div class="half__input">
      <button
        type="button"
        class="plus"
        :class="{ 'plus--hidden': !controlsVisible }"
        :disabled="locked"
        :aria-label="`Point pour ${TEAM_FULL[team]}`"
        @click="$emit('score')"
      >
        +1
      </button>
    </div>
  </section>
</template>

<style scoped>
.half {
  --team: var(--blue);
  --pad-x: clamp(16px, 3vw, 40px);
  --pad-bottom: calc(12px + env(safe-area-inset-bottom));
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  min-height: 0;
  padding: calc(clamp(10px, 4vh, 24px) + env(safe-area-inset-top)) var(--pad-x) var(--pad-bottom);
  background: color-mix(in oklab, var(--team) var(--tint), var(--bg));
  container-type: size;
  overflow: hidden;
  transition: background-color 250ms ease;
}

.half--orange {
  --team: var(--orange);
}

/* The serving side is a little brighter, together with the bar under its score. */
.half--serving {
  background: color-mix(in oklab, var(--team) var(--tint-serving), var(--bg));
}

/* Keep content clear of a camera cutout on the outer edge. */
.half--left {
  padding-left: calc(var(--pad-x) + env(safe-area-inset-left));
}

.half--right {
  padding-right: calc(var(--pad-x) + env(safe-area-inset-right));
}

.half__flash {
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, var(--team) var(--flash), transparent);
  opacity: 0;
  pointer-events: none;
  animation: flash 260ms ease-out;
}

@keyframes flash {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.half__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.half--right .half__head,
.half--right .tally,
.half--right .half__input,
.half--right .team,
.half--right .tag {
  flex-direction: row-reverse;
}

.team {
  display: flex;
  align-items: center;
  gap: 0.6em;
  margin: 0;
  font-size: clamp(15px, 5.5cqh, 28px);
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--team);
}

.team__alert {
  font-size: 0.6em;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--muted);
}

/* Games and sets: a scoreboard against the net, big enough to read from the court. */
.tally {
  display: flex;
  /* Bottom-aligned: the set scores line up with the foot of the big games number. */
  align-items: flex-end;
  gap: clamp(14px, 5cqw, 32px);
}

.tally__group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tally__label {
  font-size: clamp(11px, 3.6cqh, 16px);
  font-weight: 500;
  color: var(--muted);
}

.games {
  font-size: clamp(36px, 22cqh, 110px);
  font-weight: 800;
  font-stretch: 85%;
  line-height: 0.82;
  color: var(--fg);
}

.sets {
  display: flex;
  gap: 0.45em;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: clamp(22px, 13cqh, 64px);
  font-weight: 500;
  font-stretch: 85%;
  line-height: 0.82;
  color: var(--muted);
}

.sets__item--won {
  color: var(--fg);
  font-weight: 750;
}

/* The score: the one thing that has to read from 10 metres. */
.score {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  /* Room for the bottom controls, so the serve bar never runs under them. */
  padding-bottom: clamp(0px, 13cqh, 60px);
}

.score__inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.points {
  margin: 0;
  color: var(--team);
  font-size: min(58cqh, 58cqw);
  font-weight: 800;
  font-stretch: 82%;
  line-height: 0.74;
  letter-spacing: -0.03em;
}

.points__value {
  display: block;
  animation: pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes pop {
  from {
    transform: scale(1.06);
  }
  to {
    transform: scale(1);
  }
}

/* Service: a thick bar in the team colour under the server's score. */
.serve-bar {
  display: block;
  height: clamp(6px, 2.6cqh, 14px);
  margin-top: clamp(8px, 4cqh, 20px);
  border-radius: 999px;
  background: var(--team);
  transform: scaleX(0);
  opacity: 0;
  transition: transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease;
}

.serve-bar--on {
  transform: scaleX(1);
  opacity: 1;
}

.half__input {
  position: absolute;
  bottom: var(--pad-bottom);
  left: calc(var(--pad-x) + env(safe-area-inset-left));
  display: flex;
  align-items: center;
  gap: 14px;
}

.half--right .half__input {
  right: calc(var(--pad-x) + env(safe-area-inset-right));
  left: auto;
}

.plus {
  min-width: 64px;
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: var(--control);
  color: var(--team);
  font: inherit;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 150ms ease, transform 150ms ease, opacity 200ms ease, visibility 200ms;
}

.plus--hidden {
  visibility: hidden;
  opacity: 0;
}

.plus:hover {
  background: var(--control-hover);
}

.plus:active {
  transform: scale(0.96);
}

.plus:disabled {
  opacity: 0.35;
  cursor: default;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--muted);
}

.tag__key {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.tag__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}

.tag--connected .tag__dot {
  background: var(--team);
}

.tag--connecting .tag__dot {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--muted);
}

.tag--disconnected .tag__dot,
.tag--unpaired .tag__dot {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--faint);
}
</style>
