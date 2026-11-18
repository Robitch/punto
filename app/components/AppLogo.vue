<template>
  <!-- The app icon ("Point final"), identical to the Android launcher icon: design/logo/punto.svg. -->
  <svg class="app-logo" viewBox="0 0 108 108" role="img" aria-label="Punto">
    <rect width="108" height="108" rx="24" fill="#0e0f12" />
    <g transform="translate(20 20) scale(0.68)">
      <path fill="#6e98ff" d="M15,26 a6.5,6.5 0 0 1 13,0 V75 a6.5,6.5 0 0 1 -13,0 Z" />
      <path fill="none" stroke="#6e98ff" stroke-width="13" d="M22,43.5 a19,18.5 0 1 0 38,0 a19,18.5 0 1 0 -38,0 Z" />
      <path fill="#ff8f45" d="M69.5,61 a7.5,7.5 0 1 0 15,0 a7.5,7.5 0 1 0 -15,0 Z" />
    </g>
  </svg>
</template>

<style scoped>
.app-logo {
  display: block;
  flex: none;
  border-radius: 22%;
  /* Keeps the dark tile's edge visible on the dark theme background. */
  box-shadow: 0 0 0 1px var(--line);
}
</style>
