<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { scoreLine } from '~/domain/score/summary'
import { TEAMS, type DecidingSetFormat, type Team } from '~/domain/score/types'
import { KEY_BINDINGS } from '~/services/tags/keyboardService'
import type { TagStatus } from '~/services/tags/TagService'
import { useMatchStore } from '~/stores/match'
import { useSettingsStore } from '~/stores/settings'
import { useTagsStore } from '~/stores/tags'

useHead({ title: 'Punto' })

const match = useMatchStore()
const settings = useSettingsStore()
const tags = useTagsStore()
const restoring = ref(true)

onMounted(async () => {
  if (!match.state) await match.restore()
  restoring.value = false
})

/** A match can be resumed only if it is not over. */
const resumable = computed(() => match.state !== null && match.state.winner === null)
const summary = computed(() => (match.state ? scoreLine(match.state) : []))

const TEAM_LABEL: Record<Team, string> = { blue: 'Bleu', orange: 'Orange' }

const DECIDING_SET_OPTIONS: ReadonlyArray<{ value: DecidingSetFormat; label: string }> = [
  { value: 'superTiebreak', label: 'Super tie-break' },
  { value: 'fullSet', label: 'Set complet' },
]

const STATUS_LABEL: Record<TagStatus, string> = {
  connected: 'Connecté',
  connecting: 'Connexion…',
  disconnected: 'Déconnecté',
  unpaired: 'Non appairé',
}

function tagStatusLabel(team: Team): string {
  if (tags.kind === 'keyboard') return `Touche ${KEY_BINDINGS[team].toUpperCase()}`
  return STATUS_LABEL[tags.status[team]]
}

async function newMatch(): Promise<void> {
  match.start(settings.matchSettings())
  await navigateTo('/match')
}
</script>

<template>
  <main class="home">
    <header class="home__head">
      <h1 class="brand">
        Punto
        <span class="brand__dots" aria-hidden="true"><span /><span /></span>
      </h1>
      <button
        type="button"
        class="icon-btn"
        :aria-label="settings.theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'"
        @click="settings.toggleTheme()"
      >
        <AppIcon :name="settings.theme === 'dark' ? 'sun' : 'moon'" />
      </button>
    </header>

    <section class="home__start" :class="{ 'home__start--ready': !restoring }">
      <NuxtLink v-if="resumable" to="/match" class="resume">
        <span class="resume__label">Reprendre le match</span>
        <span class="resume__score" aria-label="Score">
          <span v-for="(set, i) in summary" :key="i" class="resume__set" :class="{ 'resume__set--current': set.current }">
            <span class="is-blue">{{ set.blue }}</span>-<span class="is-orange">{{ set.orange }}</span>
          </span>
        </span>
      </NuxtLink>
      <button type="button" class="btn" :class="{ 'btn--primary': !resumable }" @click="newMatch">
        Nouveau match
      </button>
    </section>

    <section class="home__settings" aria-label="Réglages du match">
      <div class="setting">
        <p id="server-label" class="setting__label">Premier service</p>
        <div class="choices" role="radiogroup" aria-labelledby="server-label">
          <button
            v-for="team in TEAMS"
            :key="team"
            type="button"
            role="radio"
            class="team-choice"
            :class="[`team-choice--${team}`, { 'team-choice--on': settings.firstServer === team }]"
            :aria-checked="settings.firstServer === team"
            @click="settings.firstServer = team"
          >
            <span class="team-choice__dot" aria-hidden="true" />
            {{ TEAM_LABEL[team] }}
          </button>
        </div>
      </div>

      <div class="setting">
        <p id="deciding-label" class="setting__label">Troisième set</p>
        <div class="segmented" role="radiogroup" aria-labelledby="deciding-label">
          <button
            v-for="option in DECIDING_SET_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            class="segmented__item"
            :class="{ 'segmented__item--on': settings.decidingSet === option.value }"
            :aria-checked="settings.decidingSet === option.value"
            @click="settings.decidingSet = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="setting">
        <p class="setting__label">Tags</p>
        <ul class="tags">
          <li v-for="team in TEAMS" :key="team" class="tags__item" :class="[`tags__item--${team}`, `tags__item--${tags.status[team]}`]">
            <span class="tags__dot" aria-hidden="true" />
            <span class="tags__team">{{ TEAM_LABEL[team] }}</span>
            <span class="tags__status">{{ tagStatusLabel(team) }}</span>
          </li>
        </ul>
        <NuxtLink to="/tags" class="link">Appairer les tags</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'head head'
    'start settings';
  gap: 0 clamp(24px, 6vw, 72px);
  min-height: 100%;
  padding: clamp(16px, 5vh, 36px) clamp(16px, 5vw, 56px);
}

@media (orientation: portrait) {
  .home {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    grid-template-areas: 'head' 'start' 'settings';
    gap: 28px;
  }
}

.home__head {
  grid-area: head;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: flex-start;
  gap: 0.12em;
  margin: 0;
  font-size: clamp(56px, min(22vh, 19vw), 132px);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.035em;
  line-height: 0.85;
}

.brand__dots {
  display: flex;
  gap: 0.06em;
  margin-top: 0.1em;
}

.brand__dots span {
  width: 0.14em;
  height: 0.14em;
  border-radius: 50%;
  background: var(--blue);
}

.brand__dots span + span {
  background: var(--orange);
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition: color 150ms ease, background-color 150ms ease;
}

.icon-btn:hover {
  background: var(--control);
  color: var(--fg);
}

/* Start: the main actions, anchored at the bottom of the left column. */
.home__start {
  grid-area: start;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
  opacity: 0;
  transition: opacity 200ms ease;
}

.home__start--ready {
  opacity: 1;
}

.btn,
.resume {
  display: flex;
  align-items: center;
  min-height: 60px;
  padding: 0 28px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--control);
  color: var(--fg);
  font: inherit;
  font-size: 19px;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease, transform 150ms ease;
}

.btn:hover {
  background: var(--control-hover);
}

.btn:active,
.resume:active {
  transform: scale(0.98);
}

.btn--primary,
.resume {
  border-color: transparent;
  background: var(--fg);
  color: var(--bg);
}

.btn--primary:hover,
.resume:hover {
  background: color-mix(in oklab, var(--fg) 88%, var(--bg));
}

.resume {
  justify-content: space-between;
  gap: 16px;
}

.resume__score {
  display: flex;
  gap: 0.7em;
  font-size: 17px;
  font-weight: 600;
  color: color-mix(in oklab, var(--bg) 60%, var(--fg));
}

.resume__set--current {
  font-weight: 800;
}

/* The blue / orange of the resume button sit on an inverted background. */
.resume .is-blue {
  color: color-mix(in oklab, var(--blue) 70%, var(--bg));
}

.resume .is-orange {
  color: color-mix(in oklab, var(--orange) 70%, var(--bg));
}

/* Settings: a quiet list separated by hairlines. */
.home__settings {
  grid-area: settings;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.setting {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: clamp(10px, 3vh, 18px) 0;
  border-top: 1px solid var(--line);
}

.setting:first-child {
  border-top: 0;
}

.setting__label {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
}

.choices {
  display: flex;
  gap: 8px;
}

.team-choice {
  --team: var(--blue);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 20px 0 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: none;
  color: var(--fg);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}

.team-choice--orange {
  --team: var(--orange);
}

.team-choice__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px var(--team);
  transition: background-color 150ms ease;
}

.team-choice--on {
  border-color: transparent;
  background: color-mix(in oklab, var(--team) 16%, transparent);
  color: var(--team);
}

.team-choice--on .team-choice__dot {
  background: var(--team);
}

.segmented {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: var(--control);
}

.segmented__item {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.segmented__item--on {
  background: var(--bg);
  color: var(--fg);
}

.tags {
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tags__item {
  --team: var(--blue);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.tags__item--orange {
  --team: var(--orange);
}

.tags__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px var(--faint);
}

.tags__item--connected .tags__dot {
  background: var(--team);
  box-shadow: none;
}

.tags__team {
  font-weight: 600;
  color: var(--team);
}

.tags__status {
  color: var(--muted);
}

.link {
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  color: var(--fg);
  font-size: 15px;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--faint);
  text-underline-offset: 4px;
}
</style>
