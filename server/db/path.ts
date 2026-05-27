import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const BUBBLES_APP_ID = 'com.vishnu-mac.bubbles.mail'
export const BUBBLES_DB_FILENAME = 'bubbles.mail.sqlite'

export function getBubblesAppDataDir() {
  if (process.env.BUBBLES_APP_DATA_DIR) {
    return process.env.BUBBLES_APP_DATA_DIR
  }

  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', BUBBLES_APP_ID)
  }

  if (process.platform === 'win32') {
    const base = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(base, BUBBLES_APP_ID)
  }

  const base = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  return join(base, BUBBLES_APP_ID)
}

export function getBubblesDbPath() {
  return process.env.BUBBLES_MAIL_DB_PATH || process.env.BUBBLES_DB_PATH || join(getBubblesAppDataDir(), BUBBLES_DB_FILENAME)
}

export function ensureBubblesDbDirectory(dbPath = getBubblesDbPath()) {
  mkdirSync(dirname(dbPath), { recursive: true })
  return dbPath
}
