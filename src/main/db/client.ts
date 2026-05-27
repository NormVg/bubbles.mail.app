import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { ensureBubblesDbDirectory, getBubblesDbPath } from './path'
import { runSqliteMigrations } from './migrations'
import * as schema from './schema'

let sqlite: Database.Database | undefined
let db: BetterSQLite3Database<typeof schema> | undefined

export function getSqliteConnection() {
  if (!sqlite) {
    const dbPath = ensureBubblesDbDirectory(getBubblesDbPath())
    sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    runSqliteMigrations(sqlite)
  }

  return sqlite
}

export function getDb() {
  if (!db) {
    db = drizzle(getSqliteConnection(), { schema })
  }

  return db
}

export function closeDbForTests() {
  if (sqlite) {
    sqlite.close()
  }

  sqlite = undefined
  db = undefined
}

export { schema }
