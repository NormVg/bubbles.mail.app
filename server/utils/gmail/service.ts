import { google, type gmail_v1 } from 'googleapis'
import { createOAuth2Client } from './oauth'
import { buildRawEmail, parseGmailMessage, type SendEmailPayload } from './message'
import {
  consumeOauthState,
  findGmailAccount,
  getStoredGmailMessage,
  listStoredGmailMessages,
  updateGmailAccountSync,
  updateGmailAccountTokens,
  updateStoredMessageLabels,
  upsertGmailAccount,
  upsertGmailMessage,
} from './repository'

export type GmailAction = 'archive' | 'trash' | 'star' | 'unstar' | 'markRead' | 'markUnread'

export async function connectGmailAccountFromCallback(code: string, state: string) {
  const oauthState = await consumeOauthState(state)
  if (!oauthState) {
    throw new Error('Invalid or expired Gmail OAuth state.')
  }

  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token) {
    throw new Error('Google did not return an access token.')
  }

  oauth2Client.setCredentials(tokens)

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const profile = await oauth2.userinfo.get()
  const email = profile.data.email

  if (!email) {
    throw new Error('Google profile did not include an email address.')
  }

  const existing = await findGmailAccount(email)
  const refreshToken = tokens.refresh_token || existing?.refreshToken

  if (!refreshToken) {
    throw new Error('Google did not return a refresh token. Reconnect with consent prompt enabled.')
  }

  const account = await upsertGmailAccount({
    id: existing?.id || crypto.randomUUID(),
    email,
    googleUserId: profile.data.id || null,
    displayName: profile.data.name || null,
    avatarUrl: profile.data.picture || null,
    accessToken: tokens.access_token,
    refreshToken,
    tokenType: tokens.token_type || null,
    scope: tokens.scope || null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  })

  return { account, redirectAfter: oauthState.redirectAfter }
}

export async function getAuthenticatedGmailClient(accountRef: string) {
  const account = await findGmailAccount(accountRef)

  if (!account) {
    throw new Error(`Gmail account not found: ${accountRef}`)
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken || undefined,
    expiry_date: account.expiryDate?.getTime(),
    token_type: account.tokenType || undefined,
    scope: account.scope || undefined,
  })

  oauth2Client.on('tokens', async (tokens) => {
    await updateGmailAccountTokens(account.id, {
      accessToken: tokens.access_token || account.accessToken,
      refreshToken: tokens.refresh_token || account.refreshToken,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : account.expiryDate,
      scope: tokens.scope || account.scope,
      tokenType: tokens.token_type || account.tokenType,
    })
  })

  return {
    account,
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
  }
}

export async function syncGmailMessages(options: {
  accountId: string
  label?: string
  q?: string
  maxResults?: number
  pageToken?: string
}) {
  const { account, gmail } = await getAuthenticatedGmailClient(options.accountId)
  const { labelIds, queryParts } = buildListQuery(options.label, options.q)
  const maxResults = Math.min(Math.max(options.maxResults || 25, 1), 100)

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken: options.pageToken,
    labelIds: labelIds.length ? labelIds : undefined,
    q: queryParts.length ? queryParts.join(' ') : undefined,
  })

  const refs = listResponse.data.messages || []
  const fetched = await Promise.all(
    refs.map(async (messageRef) => {
      if (!messageRef.id) return null
      const response = await gmail.users.messages.get({ userId: 'me', id: messageRef.id, format: 'full' })
      return response.data
    }),
  )

  const records = []

  for (const message of fetched) {
    if (!message?.id) continue
    const record = parseGmailMessage(account.id, message)
    records.push(await upsertGmailMessage(record))
  }

  await updateGmailAccountSync(account.id, records[0]?.historyId || account.historyId)

  return {
    accountId: account.id,
    email: account.email,
    synced: records.length,
    nextPageToken: listResponse.data.nextPageToken || null,
    resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
  }
}

export async function listCachedMessages(options: {
  accountId?: string
  q?: string
  limit?: number
  before?: number
}) {
  const account = options.accountId ? await findGmailAccount(options.accountId) : null

  if (options.accountId && !account) {
    throw new Error(`Gmail account not found: ${options.accountId}`)
  }

  return listStoredGmailMessages({
    accountId: account?.id,
    query: options.q,
    limit: options.limit,
    before: options.before,
  })
}

export async function readGmailMessage(options: {
  accountId: string
  messageId: string
  refresh?: boolean
}) {
  const { account, gmail } = await getAuthenticatedGmailClient(options.accountId)

  if (!options.refresh) {
    const cached = await getStoredGmailMessage(account.id, options.messageId)
    if (cached) return cached
  }

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: options.messageId,
    format: 'full',
  })
  const record = await upsertGmailMessage(parseGmailMessage(account.id, response.data))

  return getStoredGmailMessage(account.id, record.gmailMessageId)
}

export async function sendGmailMessage(accountRef: string, payload: SendEmailPayload) {
  const { gmail } = await getAuthenticatedGmailClient(accountRef)
  const raw = buildRawEmail(payload)

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      threadId: payload.threadId,
    },
  })

  return {
    success: true,
    id: response.data.id || null,
    threadId: response.data.threadId || null,
    labelIds: response.data.labelIds || [],
  }
}

export async function applyGmailMessageAction(options: {
  accountId: string
  messageId: string
  action: GmailAction
}) {
  const { account, gmail } = await getAuthenticatedGmailClient(options.accountId)
  let response: { data: gmail_v1.Schema$Message }

  if (options.action === 'trash') {
    response = await gmail.users.messages.trash({ userId: 'me', id: options.messageId })
  } else {
    response = await gmail.users.messages.modify({
      userId: 'me',
      id: options.messageId,
      requestBody: getActionModification(options.action),
    })
  }

  await updateStoredMessageLabels(account.id, options.messageId, response.data.labelIds || [])

  return {
    success: true,
    id: response.data.id || options.messageId,
    labels: response.data.labelIds || [],
  }
}

function buildListQuery(label?: string, q?: string) {
  const labelIds: string[] = []
  const queryParts: string[] = []
  const rawLabel = (label || 'INBOX').toUpperCase()

  if (rawLabel === 'ARCHIVE') {
    queryParts.push('-in:inbox -in:spam -in:trash')
  } else if (rawLabel.startsWith('CATEGORY_')) {
    queryParts.push(`category:${rawLabel.replace('CATEGORY_', '').toLowerCase()}`)
  } else if (rawLabel !== 'ALL') {
    labelIds.push(rawLabel)
  }

  if (q?.trim()) queryParts.push(q.trim())

  return { labelIds, queryParts }
}

function getActionModification(action: GmailAction): gmail_v1.Schema$ModifyMessageRequest {
  const actions: Record<GmailAction, gmail_v1.Schema$ModifyMessageRequest> = {
    archive: { removeLabelIds: ['INBOX'] },
    trash: {},
    star: { addLabelIds: ['STARRED'] },
    unstar: { removeLabelIds: ['STARRED'] },
    markRead: { removeLabelIds: ['UNREAD'] },
    markUnread: { addLabelIds: ['UNREAD'] },
  }

  return actions[action]
}
