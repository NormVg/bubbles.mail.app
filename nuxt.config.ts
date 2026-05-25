export default defineNuxtConfig({
  compatibilityDate: '2026-05-25',
  devtools: { enabled: true },
  // Use SSG (no SSR) for Tauri
  ssr: false,
  // Makes the Nuxt dev server reachable from other devices (iOS physical devices)
  devServer: {
    host: '0',
  },
  vite: {
    // Better support for Tauri CLI output
    clearScreen: false,
    // Enable environment variables for Vite and Tauri
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      // Tauri requires a consistent port
      strictPort: true,
    },
  },
  // Avoid watching Tauri internals
  ignore: ['**/src-tauri/**'],
  // Disable Nuxt telemetry in CI/local dev
  telemetry: false,
});
