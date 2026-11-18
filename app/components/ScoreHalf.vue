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
}>()

defineEmits<{ score: [] }>()

const TEAM_LABEL: Record<Team, string> = { blue: 'Bleu', orange: 'Orange' }
const TEAM_FULL: Record<Team, string> = { blue: 'l’équipe bleue', orange: 'l’équipe orange' }

/** Short status text: hidden when everything is fine, explicit when a tag needs attention. */
const tagLabel = computed(() => {
  if (props.tagKind === 'keyboard') return KEY_BINDINGS[props.team].toUpperCase()
  switch (props.tagStatus) {
    case 'connected':
      return ''
    case 'connecting':
      return 'Connexion…'
    case 'disconnected':
      return 'Déconnecté'
    case 'unpaired':
      return 'Non appairé'
  }
  return ''
})

const tagTitle = computed(() =>
  props.tagKind === 'keyboard'
    ? `Tag simulé : touche ${KEY_BINDINGS[props.team].toUpperCase()}`
    : `Tag ${tagLabel.value.toLowerCase() || 'connecté'}`,
)
</script>

<template>
  <section
    class="half"
    :class="[`half--${side}`, `half--${team}`]"
    :aria-label="team === 'blue' ? 'Équipe bleue' : 'Équipe orange'"
  >
    <div v-if="flashKey !== null" :key="flashKey" class="half__flash" aria-hidden="true" />

    <header class="half__head">
      <p class="team">
        <span>{{ TEAM_LABEL[team] }}</span>
        <span v-if="serving" class="team__ball" role="img" aria-label="au service" />
      </p>
      <ol v-if="sets.length" class="sets" aria-label="Sets terminés">
        <li v-for="(set, i) in sets" :key="i" :class="{ 'sets__item--won': set.won }">{{ set.value }}</li>
      </ol>
    </header>

    <p class="points" aria-live="polite">
      <span :key="flashKey ?? 'initial'" class="points__value">{{ points }}</span>
    </p>

    <footer class="half__foot">
      <div class="half__input">
        <button
          type="button"
          class="plus"
          :disabled="locked"
          :aria-label="`Point pour ${TEAM_FULL[team]}`"
          @click="$emit('score')"
        >
          +1
        </button>
        <span class="tag" :class="`tag--${tagStatus}`" :title="tagTitle" role="status" :aria-label="tagTitle">
          <span class="tag__dot" aria-hidden="true" />
          <kbd v-if="tagKind === 'keyboard'" class="tag__key">{{ tagLabel }}</kbd>
          <span v-else-if="tagLabel">{{ tagLabel }}</span>
        </span>
      </div>
      <p class="games">
        <span class="games__value">{{ games }}</span>
        <span class="games__label">{{ games > 1 ? 'jeux' : 'jeu' }}</span>
      </p>
    </footer>
  </section>
</template>

<style scoped>
.half {
  --team: var(--blue);
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
  min-height: 0;
  padding: clamp(12px, 4.5vh, 28px) clamp(16px, 3vw, 40px) 12px;
  background: color-mix(in oklab, var(--team) var(--tint), var(--bg));
  container-type: size;
  overflow: hidden;
  transition: background-color 200ms ease;
}

.half--orange {
  --team: var(--orange);
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

/* Head: team name on the outer edge, completed sets towards the centre line. */
.half__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.half--right .half__head,
.half--right .half__input {
  flex-direction: row-reverse;
}

.team {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0;
  font-size: clamp(16px, 6.5cqh, 34px);
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--team);
}

.half--right .team {
  flex-direction: row-reverse;
}

.team__ball {
  width: 0.62em;
  height: 0.62em;
  border-radius: 50%;
  background: var(--team);
  box-shadow: 0 0 0 0.18em color-mix(in oklab, var(--team) 22%, transparent);
}

.sets {
  display: flex;
  gap: 0.6em;
  margin: 0 clamp(0px, 12vw, 96px) 0 0;
  padding: 0;
  list-style: none;
  font-size: clamp(16px, 7cqh, 36px);
  font-weight: 500;
  color: var(--muted);
}

.half--right .sets {
  margin: 0 0 0 clamp(0px, 12vw, 96px);
}

@media (orientation: portrait) {
  .sets,
  .half--right .sets {
    margin: 0;
  }
}

.sets__item--won {
  color: var(--fg);
  font-weight: 750;
}

/* The score: the one thing that has to read from 10 metres. */
.points {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: 0;
  color: var(--team);
  font-size: min(68cqh, 64cqw);
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

.games {
  grid-row: 1;
  grid-column: 2;
  display: flex;
  align-items: baseline;
  gap: 0.3em;
  margin: 0;
  line-height: 1;
}

.games__value {
  font-size: clamp(28px, 15cqh, 80px);
  font-weight: 700;
  font-stretch: 90%;
  color: var(--fg);
}

.games__label {
  font-size: clamp(13px, 4.5cqh, 22px);
  font-weight: 500;
  color: var(--muted);
}

/* Foot: +1 and tag status on the outer edge, games in the middle of the half. */
.half__foot {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  min-height: 48px;
}

.half__input {
  grid-row: 1;
  grid-column: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.half--right .half__input {
  grid-column: 3;
  justify-self: end;
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
  transition: background-color 150ms ease, transform 150ms ease;
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
