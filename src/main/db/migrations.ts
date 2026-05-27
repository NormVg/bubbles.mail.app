import type { Database } from 'better-sqlite3'

type Migration = {
  id: string
  statements: string[]
}

const migrations: Migration[] = [
  {
    id: '0001_gmail_core',
    statements: [
      `CREATE TABLE IF NOT EXISTS gmail_accounts (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        google_user_id TEXT,
        display_name TEXT,
        avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type TEXT,
        scope TEXT,
        expiry_date INTEGER,
        history_id TEXT,
        last_sync_at INTEGER,
        connected_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS gmail_accounts_email_unique ON gmail_accounts (email)`,
      `CREATE INDEX IF NOT EXISTS gmail_accounts_updated_at_idx ON gmail_accounts (updated_at)`,
      `CREATE TABLE IF NOT EXISTS gmail_oauth_states (
        state TEXT PRIMARY KEY NOT NULL,
        redirect_after TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS gmail_oauth_states_expires_at_idx ON gmail_oauth_states (expires_at)`,
      `CREATE TABLE IF NOT EXISTS gmail_messages (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
        gmail_message_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        history_id TEXT,
        internal_date INTEGER,
        subject TEXT NOT NULL,
        snippet TEXT NOT NULL DEFAULT '',
        from_name TEXT,
        from_email TEXT,
        to_json TEXT NOT NULL DEFAULT '[]',
        cc_json TEXT NOT NULL DEFAULT '[]',
        bcc_json TEXT NOT NULL DEFAULT '[]',
        reply_to TEXT,
        message_id_header TEXT,
        in_reply_to TEXT,
        references_header TEXT,
        body_text TEXT,
        body_html TEXT,
        label_ids_json TEXT NOT NULL DEFAULT '[]',
        is_unread INTEGER NOT NULL DEFAULT 0,
        is_starred INTEGER NOT NULL DEFAULT 0,
        size_estimate INTEGER,
        synced_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS gmail_messages_account_message_unique ON gmail_messages (account_id, gmail_message_id)`,
      `CREATE INDEX IF NOT EXISTS gmail_messages_account_date_idx ON gmail_messages (account_id, internal_date)`,
      `CREATE INDEX IF NOT EXISTS gmail_messages_thread_idx ON gmail_messages (thread_id)`,
    ],
  },
  {
    id: '0002_gmail_drafts',
    statements: [
      `CREATE TABLE IF NOT EXISTS gmail_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        account_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        to_json TEXT NOT NULL DEFAULT '[]',
        cc_json TEXT NOT NULL DEFAULT '[]',
        bcc_json TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL
      )`
    ]
  }
]

export function runSqliteMigrations(sqlite: Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _bubbles_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `)

  const hasMigration = sqlite.prepare('SELECT 1 FROM _bubbles_migrations WHERE id = ? LIMIT 1')
  const recordMigration = sqlite.prepare('INSERT INTO _bubbles_migrations (id, applied_at) VALUES (?, ?)')

  for (const migration of migrations) {
    if (hasMigration.get(migration.id)) continue

    const applyMigration = sqlite.transaction(() => {
      for (const statement of migration.statements) {
        sqlite.exec(statement)
      }
      recordMigration.run(migration.id, Date.now())
    })

    applyMigration()
  }
}
