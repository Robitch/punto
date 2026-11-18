<script setup lang="ts">
import { computed } from 'vue'
import { otherTeam, TEAMS, type MatchState, type Team } from '~/domain/score/types'

const props = defineProps<{ state: MatchState; winner: Team }>()
defineEmits<{ rematch: []; home: []; undo: [] }>()

const TEAM_LABEL: Record<Team, string> = { blue: 'Bleu', orange: 'Orange' }
const HEADLINE: Record<Team, string> = { blue: 'L’équipe bleue gagne', orange: 'L’équipe orange gagne' }

interface Cell {
  value: number
  won: boolean
  /** Tie-break points of the team that lost the tie-break (7-6⁵ convention). */
  tiebreak: number | null
}

const rows = computed(() =>
  TEAMS.map((team) => ({
    team,
    cells: props.state.completedSets.map<Cell>((set) => {
      if (set.kind === 'superTiebreak') {
        return { value: set.points[team], won: set.winner === team, tiebreak: null }
      }
      const lostTiebreak = set.tiebreak !== null && set.winner !== team
      return {
        value: set.games[team],
        won: set.winner === team,
        tiebreak: lostTiebreak && set.tiebreak ? set.tiebreak[team] : null,
      }
    }),
  })),
)

const loser = computed(() => otherTeam(props.winner))
</script>

<template>
  <div class="result" role="dialog" aria-modal="true" aria-labelledby="result-title">
    <div class="result__panel">
      <h1 id="result-title" class="result__title" :class="`result__title--${winner}`">
        {{ HEADLINE[winner] }}
      </h1>

      <table class="score" :aria-label="`Score final, ${TEAM_LABEL[winner]} contre ${TEAM_LABEL[loser]}`">
        <tbody>
          <tr v-for="row in rows" :key="row.team" :class="`score__row--${row.team}`">
            <th scope="row">{{ TEAM_LABEL[row.team] }}</th>
            <td v-for="(cell, i) in row.cells" :key="i" :class="{ 'score__cell--won': cell.won }">
              {{ cell.value }}<sup v-if="cell.tiebreak !== null">{{ cell.tiebreak }}</sup>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="result__actions">
        <button type="button" class="btn btn--primary" @click="$emit('rematch')">Revanche</button>
        <button type="button" class="btn" @click="$emit('home')">Accueil</button>
      </div>
      <button type="button" class="result__undo" @click="$emit('undo')">Annuler le dernier point</button>
    </div>
  </div>
</template>

<style scoped>
.result {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay);
  backdrop-filter: blur(6px);
  animation: fade 240ms ease-out;
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

.result__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 5vh, 32px);
  text-align: center;
}

.result__title {
  margin: 0;
  font-size: clamp(32px, 11vh, 72px);
  font-weight: 800;
  font-stretch: 85%;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--blue);
}

.result__title--orange {
  color: var(--orange);
}

.score {
  border-collapse: collapse;
  font-size: clamp(22px, 8vh, 44px);
  line-height: 1.15;
}

.score th {
  padding-right: 0.9em;
  text-align: left;
  font-size: 0.5em;
  font-weight: 600;
}

.score__row--blue th {
  color: var(--blue);
}

.score__row--orange th {
  color: var(--orange);
}

.score td {
  min-width: 1.6em;
  padding: 0 0.3em;
  text-align: center;
  font-weight: 500;
  color: var(--muted);
}

.score td.score__cell--won {
  font-weight: 750;
  color: var(--fg);
}

.score sup {
  margin-left: 0.05em;
  font-size: 0.45em;
  font-weight: 500;
}

.result__actions {
  display: flex;
  gap: 12px;
}

.btn {
  min-width: 140px;
  min-height: 52px;
  padding: 0 28px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--control);
  color: var(--fg);
  font: inherit;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.btn:hover {
  background: var(--control-hover);
}

.btn--primary {
  border-color: transparent;
  background: var(--fg);
  color: var(--bg);
}

.btn--primary:hover {
  background: color-mix(in oklab, var(--fg) 88%, var(--bg));
}

.result__undo {
  min-height: 48px;
  padding: 0 12px;
  border: 0;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
</style>
