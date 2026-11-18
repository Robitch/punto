<script setup lang="ts">
import { KEY_BINDINGS } from '~/services/tags/keyboardService'
import { useTagsStore } from '~/stores/tags'

// Placeholder until the BLE pairing flow (next step).
useHead({ title: 'Tags' })

const tags = useTagsStore()
</script>

<template>
  <main class="tags-page">
    <NuxtLink to="/" class="back" aria-label="Retour à l’accueil">
      <AppIcon name="back" />
    </NuxtLink>
    <div class="tags-page__body">
      <h1 class="tags-page__title">Appairage des tags</h1>
      <p v-if="tags.kind === 'keyboard'" class="tags-page__text">
        Dans le navigateur, les tags sont simulés au clavier&nbsp;: touche
        <kbd>{{ KEY_BINDINGS.blue.toUpperCase() }}</kbd> pour l’équipe bleue,
        <kbd>{{ KEY_BINDINGS.orange.toUpperCase() }}</kbd> pour l’équipe orange.
        Un double appui annule le dernier point.
      </p>
      <p v-else class="tags-page__text">L’appairage des iTags arrive bientôt.</p>
    </div>
  </main>
</template>

<style scoped>
.tags-page {
  min-height: 100%;
  padding: clamp(16px, 5vh, 36px) clamp(16px, 5vw, 56px);
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

.tags-page__body {
  max-width: 34em;
  margin-top: 16px;
}

.tags-page__title {
  margin: 0 0 16px;
  font-size: clamp(32px, 9vh, 56px);
  font-weight: 800;
  font-stretch: 85%;
  letter-spacing: -0.02em;
  line-height: 1;
}

.tags-page__text {
  margin: 0;
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
</style>
