<script setup lang="ts">
import { onMounted } from 'vue'
import { useTagConnection } from '~/composables/useScoring'
import { useSettingsStore } from '~/stores/settings'

const settings = useSettingsStore()
onMounted(() => void settings.load())
useTagConnection()
</script>

<template>
  <NuxtPage />
</template>
