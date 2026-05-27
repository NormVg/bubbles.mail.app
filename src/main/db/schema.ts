import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const gmailAccounts = sqliteTable(
  'gmail_accounts',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    googleUserId: text('google_user_id'),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenType: text('token_type'),
    scope: text('scope'),
    expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }),
    historyId: text('history_id'),
    lastSyncAt: integer('last_sync_at', { mode: 'timestamp_ms' }),
    connectedAt: integer('connected_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex('gmail_accounts_email_unique').on(table.email),
    index('gmail_accounts_updated_at_idx').on(table.updatedAt),
  ],
)

export const gmailOauthStates = sqliteTable(
  'gmail_oauth_states',
  {
    state: text('state').primaryKey(),
    redirectAfter: text('redirect_after'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('gmail_oauth_states_expires_at_idx').on(table.expiresAt)],
)

export const gmailMessages = sqliteTable(
  'gmail_messages',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => gmailAccounts.id, { onDelete: 'cascade' }),
    gmailMessageId: text('gmail_message_id').notNull(),
    threadId: text('thread_id').notNull(),
    historyId: text('history_id'),
    internalDate: integer('internal_date', { mode: 'timestamp_ms' }),
    subject: text('subject').notNull(),
    snippet: text('snippet').notNull().default(''),
    fromName: text('from_name'),
    fromEmail: text('from_email'),
    toJson: text('to_json').notNull().default('[]'),
    ccJson: text('cc_json').notNull().default('[]'),
    bccJson: text('bcc_json').notNull().default('[]'),
    replyTo: text('reply_to'),
    messageIdHeader: text('message_id_header'),
    inReplyTo: text('in_reply_to'),
    referencesHeader: text('references_header'),
    bodyText: text('body_text'),
    bodyHtml: text('body_html'),
    labelIdsJson: text('label_ids_json').notNull().default('[]'),
    isUnread: integer('is_unread', { mode: 'boolean' }).notNull().default(false),
    isStarred: integer('is_starred', { mode: 'boolean' }).notNull().default(false),
    sizeEstimate: integer('size_estimate'),
    syncedAt: integer('synced_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('gmail_messages_account_message_unique').on(table.accountId, table.gmailMessageId),
    index('gmail_messages_account_date_idx').on(table.accountId, table.internalDate),
    index('gmail_messages_thread_idx').on(table.threadId),
  ],
)

export const gmailAccountsRelations = relations(gmailAccounts, ({ many }) => ({
  messages: many(gmailMessages),
}))

export const gmailMessagesRelations = relations(gmailMessages, ({ one }) => ({
  account: one(gmailAccounts, {
    fields: [gmailMessages.accountId],
    references: [gmailAccounts.id],
  }),
}))

export type GmailAccount = typeof gmailAccounts.$inferSelect
export type NewGmailAccount = typeof gmailAccounts.$inferInsert
export type GmailMessageRecord = typeof gmailMessages.$inferSelect
export type NewGmailMessageRecord = typeof gmailMessages.$inferInsert
