import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { config } from 'dotenv'

config()

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.NUXT_GOOGLE_CLIENT_ID': JSON.stringify(process.env.NUXT_GOOGLE_CLIENT_ID),
      'process.env.NUXT_GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.NUXT_GOOGLE_CLIENT_SECRET),
      'process.env.NUXT_GOOGLE_REDIRECT_URI': JSON.stringify(process.env.NUXT_GOOGLE_REDIRECT_URI)
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      vue(),
      Components({
        dirs: [resolve(__dirname, 'src/renderer/src/components')],
        dts: resolve(__dirname, 'src/renderer/src/components.d.ts')
      })
    ]
  }
})
