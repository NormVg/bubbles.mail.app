
Select language

    Guides
    References
    Blog

        What is Tauri?
        Prerequisites
        Create a Project
        Project Structure
            Overview
            Leptos
            Next.js
            Nuxt
            Qwik
            SvelteKit
            Trunk
            Vite

On this page

    Overview
    Checklist
    Example Configuration
        Update Tauri configuration
        Update Nuxt configuration

Nuxt

Nuxt is a meta framework for Vue. Learn more about Nuxt at https://nuxt.com. This guide is accurate as of Nuxt 4.2.
Checklist

    Use SSG by setting ssr: false. Tauri doesn’t support server based solutions.
    Use default ../dist as frontendDist in tauri.conf.json.
    Compile using nuxi build.
    (Optional): Disable telemetry by setting telemetry: false in nuxt.config.ts.

Example Configuration

    Update Tauri configuration
        npm
        yarn
        pnpm
        deno
    tauri.conf.json

    {
      "build": {
        "beforeDevCommand": "pnpm dev",
        "beforeBuildCommand": "pnpm generate",
        "devUrl": "http://localhost:3000",
        "frontendDist": "../dist"
      }
    }

    Update Nuxt configuration

    export default defineNuxtConfig({
      compatibilityDate: '2025-05-15',
      // (optional) Enable the Nuxt devtools
      devtools: { enabled: true },
      // Enable SSG
      ssr: false,
      // Enables the development server to be discoverable by other devices when running on iOS physical devices
      devServer: {
        host: '0',
      },
      vite: {
        // Better support for Tauri CLI output
        clearScreen: false,
        // Enable environment variables
        // Additional environment variables can be found at
        // https://v2.tauri.app/reference/environment-variables/
        envPrefix: ['VITE_', 'TAURI_'],
        server: {
          // Tauri requires a consistent port
          strictPort: true,
        },
      },
      // Avoids error [unhandledRejection] EMFILE: too many open files, watch
      ignore: ['**/src-tauri/**'],
    });



Last updated: Dec 16, 2025
Previous
Next.js
Next
Qwik
Support on Open Collective
Sponsor on GitHub

© 2026 Tauri Contributors. CC-BY / MIT
