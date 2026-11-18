<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMatchStore } from '~/stores/match'

// Minimal home for now: the full home screen (server choice, deciding set,
// tags, theme) comes in a later step.
useHead({ title: 'Padel' })

const match = useMatchStore()
const canResume = ref(false)

onMounted(async () => {
  canResume.value = match.state !== null || (await match.restore())
})

async function newMatch(): Promise<void> {
  match.start()
  await navigateTo('/match')
}
</script>

<template>
  <main class="home">
    <h1 class="home__title">Padel</h1>
    <div class="home__actions">
      <button type="button" class="btn btn--primary" @click="newMatch">Nouveau match</button>
      <NuxtLink v-if="canResume" to="/match" class="btn">Reprendre le match</NuxtLink>
    </div>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  min-height: 100%;
  padding: 16px;
}

.home__title {
  margin: 0;
  font-size: clamp(48px, 16vh, 120px);
  font-weight: 800;
  font-stretch: 80%;
  letter-spacing: -0.03em;
  line-height: 1;
}

.home__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.btn {
  display: inline-grid;
  place-items: center;
  min-height: 56px;
  padding: 0 32px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--control);
  color: var(--fg);
  font: inherit;
  font-size: 18px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.btn--primary {
  border-color: transparent;
  background: var(--fg);
  color: var(--bg);
}
</style>
