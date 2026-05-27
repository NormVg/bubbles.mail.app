import { defineConfig } from 'drizzle-kit'
import { getBubblesDbPath } from './server/db/path'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: getBubblesDbPath(),
  },
})
