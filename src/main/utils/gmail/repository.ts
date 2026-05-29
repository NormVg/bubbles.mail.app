import { and, desc, eq, like, lt, or, gt } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { gmailAccounts, gmailMessages, gmailOauthStates, type GmailAccount, type NewGmailAccount, type NewGmailMessageRecord } from '../../db/schema'
import { toStoredMessage } from './message'

export async function createOauthState(redirectAfter?: string | null) {
  const db = getDb()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)
  const state = crypto.randomUUID()

  await db.delete(gmailOauthStates).where(lt(gmailOauthStates.expiresAt, now))
  await db.insert(gmailOauthStates).values({ state, redirectAfter: redirectAfter || null, createdAt: now, expiresAt })

  return { state, expiresAt }
}

export async function consumeOauthState(state: string) {
  const db = getDb()
  const [record] = await db.select().from(gmailOauthStates).where(eq(gmailOauthStates.state, state)).limit(1)

  if (!record) return null

  await db.delete(gmailOauthStates).where(eq(gmailOauthStates.state, state))

  if (record.expiresAt.getTime() < Date.now()) {
    return null
  }

  return record
}

export async function listGmailAccounts() {
  const db = getDb()
  const rows = await db.select().from(gmailAccounts).orderBy(desc(gmailAccounts.updatedAt))

  return rows.map(stripSensitiveAccountFields)
}

export async function findGmailAccount(accountRef: string) {
  const db = getDb()
  const [account] = await db
    .select()
    .from(gmailAccounts)
    .where(or(eq(gmailAccounts.id, accountRef), eq(gmailAccounts.email, accountRef)))
    .limit(1)

  return account || null
}

export async function findGmailAccountByEmail(email: string) {
  const db = getDb()
  const [account] = await db.select().from(gmailAccounts).where(eq(gmailAccounts.email, email)).limit(1)
  return account || null
}

export async function upsertGmailAccount(input: NewGmailAccount) {
  const db = getDb()
  const existing = await findGmailAccountByEmail(input.email)
  const now = new Date()

  if (existing) {
    const [updated] = await db
      .update(gmailAccounts)
      .set({
        googleUserId: input.googleUserId || existing.googleUserId,
        displayName: input.displayName ?? existing.displayName,
        avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken || existing.refreshToken,
        tokenType: input.tokenType ?? existing.tokenType,
        scope: input.scope ?? existing.scope,
        expiryDate: input.expiryDate ?? existing.expiryDate,
        historyId: input.historyId ?? existing.historyId,
        updatedAt: now,
      })
      .where(eq(gmailAccounts.id, existing.id))
      .returning()

    return updated
  }

  const [created] = await db
    .insert(gmailAccounts)
    .values({
      ...input,
      connectedAt: input.connectedAt || now,
      updatedAt: input.updatedAt || now,
    })
    .returning()

  return created
}

export async function updateGmailAccountTokens(accountId: string, input: Partial<Pick<GmailAccount, 'accessToken' | 'refreshToken' | 'expiryDate' | 'scope' | 'tokenType'>>) {
  const db = getDb()

  await db
    .update(gmailAccounts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(gmailAccounts.id, accountId))
}

export async function updateGmailAccountSync(accountId: string, historyId?: string | null) {
  const db = getDb()

  await db
    .update(gmailAccounts)
    .set({ historyId: historyId || undefined, lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(gmailAccounts.id, accountId))
}

export async function deleteGmailAccount(accountRef: string) {
  const account = await findGmailAccount(accountRef)
  if (!account) return false

  await getDb().delete(gmailAccounts).where(eq(gmailAccounts.id, account.id))
  return true
}

export async function upsertGmailMessage(record: NewGmailMessageRecord) {
  const db = getDb()
  const [existing] = await db.select().from(gmailMessages).where(eq(gmailMessages.id, record.id)).limit(1)

  if (existing) {
    const [updated] = await db
      .update(gmailMessages)
      .set(record)
      .where(eq(gmailMessages.id, record.id))
      .returning()

    return updated
  }

  const [created] = await db.insert(gmailMessages).values(record).returning()
  return created
}

export async function getStoredGmailMessage(accountId: string, messageId: string) {
  const db = getDb()
  const localId = messageId.includes(':') ? messageId : `${accountId}:${messageId}`
  const [record] = await db
    .select()
    .from(gmailMessages)
    .where(and(eq(gmailMessages.accountId, accountId), or(eq(gmailMessages.id, localId), eq(gmailMessages.gmailMessageId, messageId))))
    .limit(1)

  return record ? toStoredMessage(record) : null
}

export async function listStoredGmailMessages(options: {
  accountId?: string
  query?: string
  limit?: number
  before?: number
}) {
  const db = getDb()
  const filters: any[] = []

  if (options.accountId) filters.push(eq(gmailMessages.accountId, options.accountId))
  if (options.before) filters.push(lt(gmailMessages.internalDate, new Date(options.before)))
  if (options.query?.trim()) {
    const regex = /(?:([a-zA-Z_]+):)?(?:"([^"]+)"|([^\s]+))/g;
    let match;
    while ((match = regex.exec(options.query.trim())) !== null) {
      const field = match[1];
      const value = match[2] || match[3];
      
      if (!value) continue;
      
      if (field === 'from') {
         filters.push(or(like(gmailMessages.fromEmail, `%${value}%`), like(gmailMessages.fromName, `%${value}%`)))
      } else if (field === 'subject') {
         filters.push(like(gmailMessages.subject, `%${value}%`))
      } else if (field === 'is' && value === 'unread') {
         filters.push(eq(gmailMessages.isUnread, true))
      } else if (field === 'is' && value === 'read') {
         filters.push(eq(gmailMessages.isUnread, false))
      } else if (field === 'is' && value === 'starred') {
         filters.push(eq(gmailMessages.isStarred, true))
      } else if (field === 'newer_than') {
         const daysMatch = value.match(/^(\d+)d$/);
         if (daysMatch) {
           const days = parseInt(daysMatch[1], 10);
           const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
           filters.push(gt(gmailMessages.internalDate, dateLimit));
         }
      } else if (field === 'older_than') {
         const daysMatch = value.match(/^(\d+)d$/);
         if (daysMatch) {
           const days = parseInt(daysMatch[1], 10);
           const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
           filters.push(lt(gmailMessages.internalDate, dateLimit));
         }
      } else {
         const searchVal = `%${value}%`
         filters.push(or(like(gmailMessages.subject, searchVal), like(gmailMessages.snippet, searchVal), like(gmailMessages.fromEmail, searchVal), like(gmailMessages.fromName, searchVal)))
      }
    }
  }

  const rows = await db
    .select()
    .from(gmailMessages)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(gmailMessages.internalDate))
    .limit(Math.min(Math.max(options.limit || 50, 1), 100))

  return rows.map(toStoredMessage)
}

export async function updateStoredMessageLabels(accountId: string, gmailMessageId: string, labels: string[]) {
  const db = getDb()

  await db
    .update(gmailMessages)
    .set({
      labelIdsJson: JSON.stringify(labels),
      isUnread: labels.includes('UNREAD'),
      isStarred: labels.includes('STARRED'),
      updatedAt: new Date(),
    })
    .where(and(eq(gmailMessages.accountId, accountId), eq(gmailMessages.gmailMessageId, gmailMessageId)))
}

function toTimestamp(val: any): number | null {
  if (!val) return null
  if (val instanceof Date) return val.getTime()
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.getTime()
}

function stripSensitiveAccountFields(account: GmailAccount) {
  return {
    id: account.id,
    email: account.email,
    googleUserId: account.googleUserId,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    scope: account.scope,
    expiryDate: toTimestamp(account.expiryDate),
    historyId: account.historyId,
    lastSyncAt: toTimestamp(account.lastSyncAt),
    connectedAt: toTimestamp(account.connectedAt) || Date.now(),
    updatedAt: toTimestamp(account.updatedAt) || Date.now(),
  }
}
