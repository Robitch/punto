<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '~/stores/settings'

const emit = defineEmits<{ close: []; end: [] }>()
const settings = useSettingsStore()
const confirmingEnd = ref(false)

function onEnd(): void {
  if (confirmingEnd.value) emit('end')
  else confirmingEnd.value = true
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="menu-backdrop" @click.self="emit('close')">
    <div class="menu" role="menu" aria-label="Menu du match">
      <button type="button" role="menuitem" class="menu__item" @click="settings.toggleTheme()">
        {{ settings.theme === 'dark' ? 'Thème clair' : 'Thème sombre' }}
      </button>
      <button type="button" role="menuitem" class="menu__item" @click="settings.toggleVoice()">
        {{ settings.voiceEnabled ? 'Couper la voix' : 'Activer la voix' }}
      </button>
      <button
        type="button"
        role="menuitem"
        class="menu__item menu__item--danger"
        :class="{ 'menu__item--confirm': confirmingEnd }"
        @click="onEnd"
      >
        {{ confirmingEnd ? 'Confirmer la fin du match' : 'Terminer le match' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15;
}

.menu {
  position: absolute;
  bottom: 76px;
  left: 50%;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--bg);
  transform: translateX(-50%);
  animation: rise 180ms ease-out;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translate(-50%, 6px);
  }
}

.menu__item {
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--fg);
  font: inherit;
  font-size: 16px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.menu__item:hover {
  background: var(--control);
}

.menu__item--danger {
  color: var(--muted);
}

.menu__item--confirm {
  color: var(--fg);
  font-weight: 650;
  background: var(--control);
}
</style>
