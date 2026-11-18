<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { pairingPress, startPairing, type PairingState } from '~/domain/input/pairing'
import { TEAMS, type Team } from '~/domain/score/types'
import { getTagService } from '~/services/tags'
import { SCAN_DURATION_MS } from '~/services/tags/itagService'
import { KEY_BINDINGS } from '~/services/tags/keyboardService'
import { TagError, type TagErrorReason } from '~/services/tags/TagService'
import { useTagsStore } from '~/stores/tags'

useHead({ title: 'Tags' })

const tags = useTagsStore()
const service = getTagService()
const pairing = service.pairing

type Phase = 'overview' | 'starting' | 'pairing' | 'saving' | 'done' | 'error'

const phase = ref<Phase>('overview')
const errorReason = ref<TagErrorReason | null>(null)
const pairingState = ref<PairingState>(startPairing())
const candidates = ref(0)
const scanOver = ref(false)
const beeping = ref<string | null>(null)
let scanTimer: ReturnType<typeof setTimeout> | undefined

const TEAM_LABEL: Record<Team, string> = { blue: 'Bleu', orange: 'Orange' }
const PROMPT: Record<Team, string> = {
  blue: 'Appuie sur le tag de l’équipe bleue',
  orange: 'Appuie sur le tag de l’équipe orange',
}
const STATUS_LABEL = {
  connected: 'Connecté',
  connecting: 'Connexion…',
  disconnected: 'Déconnecté',
  unpaired: 'Non appairé',
} as const
const ERROR_TEXT: Record<TagErrorReason, string> = {
  'bluetooth-off': 'Le Bluetooth est désactivé. Active-le pour trouver les tags.',
  permission: 'Punto n’a pas accès au Bluetooth. Autorise-le dans les réglages de l’application.',
}

const isPaired = computed(() => TEAMS.every((team) => tags.status[team] !== 'unpaired'))
const currentTeam = computed<Team | null>(() => (pairingState.value.step === 'done' ? null : pairingState.value.step))

const searchText = computed(() => {
  if (candidates.value > 0) return candidates.value === 1 ? '1 tag trouvé' : `${candidates.value} tags trouvés`
  return scanOver.value ? 'Aucun tag trouvé. Vérifie qu’ils sont allumés et proches.' : 'Recherche des tags…'
})

const rejectedText = computed(() => {
  const { rejected, assigned } = pairingState.value
  if (!rejected) return null
  const owner = TEAMS.find((team) => assigned[team] === rejected)
  return owner ? `Ce tag est déjà celui de l’équipe ${owner === 'blue' ? 'bleue' : 'orange'}.` : null
})

async function begin(): Promise<void> {
  if (!pairing) return
  phase.value = 'starting'
  pairingState.value = startPairing()
  candidates.value = 0
  scanOver.value = false
  try {
    await pairing.begin({
      onCandidates: (count) => (candidates.value = count),
      onPress: (deviceId) => void onPairingPress(deviceId),
    })
    phase.value = 'pairing'
    clearTimeout(scanTimer)
    scanTimer = setTimeout(() => (scanOver.value = true), SCAN_DURATION_MS)
  } catch (error) {
    errorReason.value = error instanceof TagError ? error.reason : 'permission'
    phase.value = 'error'
  }
}

async function onPairingPress(deviceId: string): Promise<void> {
  if (phase.value !== 'pairing' || !pairing) return
  const next = pairingPress(pairingState.value, deviceId)
  pairingState.value = next
  const { blue, orange } = next.assigned
  if (next.step === 'done' && blue && orange) {
    phase.value = 'saving'
    clearTimeout(scanTimer)
    await pairing.finish({ blue, orange })
    phase.value = 'done'
  }
}

async function cancel(): Promise<void> {
  clearTimeout(scanTimer)
  phase.value = 'overview'
  await pairing?.cancel()
}

async function beep(team: Team): Promise<void> {
  if (beeping.value) return
  beeping.value = team
  try {
    await service.beep(team)
  } finally {
    beeping.value = null
  }
}

onBeforeUnmount(() => {
  clearTimeout(scanTimer)
  if (phase.value === 'starting' || phase.value === 'pairing') void pairing?.cancel()
})
</script>

<template>
  <main class="tags-page" :class="currentTeam && phase === 'pairing' ? `tags-page--${currentTeam}` : ''">
    <!-- Browser: keyboard simulation, nothing to pair. -->
    <template v-if="!pairing">
      <NuxtLink to="/" class="back" aria-label="Retour à l’accueil"><AppIcon name="back" /></NuxtLink>
      <div class="body">
        <h1 class="title">Tags</h1>
        <p class="text">
          Dans le navigateur, les tags sont simulés au clavier&nbsp;: touche
          <kbd>{{ KEY_BINDINGS.blue.toUpperCase() }}</kbd> pour l’équipe bleue,
          <kbd>{{ KEY_BINDINGS.orange.toUpperCase() }}</kbd> pour l’équipe orange.
          Un double appui annule le dernier point.
        </p>
      </div>
    </template>

    <!-- Paired tags, or the start of pairing. -->
    <template v-else-if="phase === 'overview'">
      <NuxtLink to="/" class="back" aria-label="Retour à l’accueil"><AppIcon name="back" /></NuxtLink>
      <div class="body">
        <h1 class="title">{{ isPaired ? 'Tags' : 'Appairer les tags' }}</h1>
        <ul v-if="isPaired" class="team-rows">
          <li v-for="team in TEAMS" :key="team" class="team-row" :class="`team-row--${team}`">
            <span class="team-row__dot" :class="`team-row__dot--${tags.status[team]}`" aria-hidden="true" />
            <span class="team-row__name">{{ TEAM_LABEL[team] }}</span>
            <span class="team-row__status">{{ STATUS_LABEL[tags.status[team]] }}</span>
            <button
              type="button"
              class="btn btn--small"
              :disabled="tags.status[team] !== 'connected' || beeping !== null"
              @click="beep(team)"
            >
              {{ beeping === team ? 'Bip…' : 'Faire biper' }}
            </button>
          </li>
        </ul>
        <p v-else class="text">Allume les deux tags et garde-les près du téléphone.</p>
        <div class="actions">
          <button type="button" class="btn" :class="{ 'btn--primary': !isPaired }" @click="begin">
            {{ isPaired ? 'Appairer de nouveaux tags' : 'Commencer' }}
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="phase === 'error' && errorReason">
      <div class="body">
        <h1 class="title">Bluetooth indisponible</h1>
        <p class="text">{{ ERROR_TEXT[errorReason] }}</p>
        <div class="actions">
          <button type="button" class="btn btn--primary" @click="begin">Réessayer</button>
          <button type="button" class="btn" @click="phase = 'overview'">Retour</button>
        </div>
      </div>
    </template>

    <!-- Guided steps: one prompt at a time, very large. -->
    <template v-else-if="phase === 'starting' || phase === 'pairing' || phase === 'saving'">
      <div class="step">
        <p class="step__count" aria-live="polite">
          {{ phase === 'starting' ? 'Recherche des tags…' : searchText }}
        </p>
        <h1 class="step__prompt" aria-live="assertive">
          {{ currentTeam ? PROMPT[currentTeam] : 'Enregistrement…' }}
        </h1>
        <p class="step__hint" aria-live="polite">
          {{ rejectedText ?? (currentTeam === 'orange' ? 'Le tag bleu est enregistré.' : ' ') }}
        </p>
        <div class="actions">
          <button v-if="scanOver && candidates === 0" type="button" class="btn btn--primary" @click="begin">
            Relancer la recherche
          </button>
          <button type="button" class="btn" @click="cancel">Annuler</button>
        </div>
      </div>
    </template>

    <template v-else-if="phase === 'done'">
      <div class="body">
        <h1 class="title">C’est prêt</h1>
        <p class="text">Fais biper un tag pour vérifier qu’il est bien sur la bonne équipe.</p>
        <ul class="team-rows">
          <li v-for="team in TEAMS" :key="team" class="team-row" :class="`team-row--${team}`">
            <span class="team-row__dot" :class="`team-row__dot--${tags.status[team]}`" aria-hidden="true" />
            <span class="team-row__name">{{ TEAM_LABEL[team] }}</span>
            <span class="team-row__status">{{ STATUS_LABEL[tags.status[team]] }}</span>
            <button
              type="button"
              class="btn btn--small"
              :disabled="tags.status[team] !== 'connected' || beeping !== null"
              @click="beep(team)"
            >
              {{ beeping === team ? 'Bip…' : 'Faire biper' }}
            </button>
          </li>
        </ul>
        <div class="actions">
          <NuxtLink to="/" class="btn btn--primary">Terminé</NuxtLink>
          <button type="button" class="btn" @click="begin">Recommencer</button>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.tags-page {
  --team: var(--fg);
  min-height: 100%;
  padding: calc(clamp(16px, 5vh, 36px) + env(safe-area-inset-top))
    calc(clamp(16px, 5vw, 56px) + env(safe-area-inset-right))
    calc(clamp(16px, 5vh, 36px) + env(safe-area-inset-bottom))
    calc(clamp(16px, 5vw, 56px) + env(safe-area-inset-left));
  transition: background-color 250ms ease;
}

/* During a step the whole screen takes the team colour, like a match half. */
.tags-page--blue {
  --team: var(--blue);
  background: color-mix(in oklab, var(--blue) var(--tint), var(--bg));
}

.tags-page--orange {
  --team: var(--orange);
  background: color-mix(in oklab, var(--orange) var(--tint), var(--bg));
}

.back {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-left: -12px;
  border-radius: 50%;
  color: var(--muted);
}

.back:hover {
  background: var(--control);
  color: var(--fg);
}

.body {
  max-width: 40em;
  margin-top: 12px;
}

.title {
  margin: 0 0 16px;
  font-size: clamp(32px, 10vh, 60px);
  font-weight: 800;
  font-stretch: 85%;
  letter-spacing: -0.02em;
  line-height: 1;
}

.text {
  margin: 0;
  max-width: 34em;
  font-size: 18px;
  line-height: 1.55;
  color: var(--muted);
}

kbd {
  padding: 1px 7px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
  font-weight: 600;
  color: var(--fg);
}

.team-rows {
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.team-row {
  --team: var(--blue);
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  border-top: 1px solid var(--line);
  font-size: 18px;
}

.team-row:first-child {
  border-top: 0;
}

.team-row--orange {
  --team: var(--orange);
}

.team-row__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px var(--faint);
}

.team-row__dot--connected {
  background: var(--team);
  box-shadow: none;
}

.team-row__name {
  min-width: 4.5em;
  font-weight: 650;
  color: var(--team);
}

.team-row__status {
  flex: 1;
  color: var(--muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 0 28px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--control);
  color: var(--fg);
  font: inherit;
  font-size: 18px;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.btn:hover {
  background: var(--control-hover);
}

.btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn--primary {
  border-color: transparent;
  background: var(--fg);
  color: var(--bg);
}

.btn--primary:hover {
  background: color-mix(in oklab, var(--fg) 88%, var(--bg));
}

.btn--small {
  min-height: 48px;
  padding: 0 18px;
  font-size: 15px;
}

/* Guided step: the prompt fills the screen. */
.step {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
}

.step__count {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 500;
  color: var(--muted);
}

.step__prompt {
  max-width: 14em;
  margin: 0;
  font-size: clamp(36px, 14vh, 88px);
  font-weight: 800;
  font-stretch: 85%;
  letter-spacing: -0.025em;
  line-height: 0.98;
  color: var(--team);
}

.step__hint {
  margin: 16px 0 0;
  min-height: 1.5em;
  font-size: 18px;
  color: var(--muted);
}

.step .actions {
  margin-top: 20px;
}
</style>
