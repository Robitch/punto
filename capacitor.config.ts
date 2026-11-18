import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'fr.robpoi.punto',
  appName: 'Punto',
  webDir: '.output/public',
  // Dark theme background, avoids a white flash while the WebView starts.
  backgroundColor: '#08090b',
  plugins: {
    SystemBars: {
      // Edge to edge; the pages pad themselves with env(safe-area-inset-*).
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
