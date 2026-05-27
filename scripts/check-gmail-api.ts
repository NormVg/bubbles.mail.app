import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tempDir = mkdtempSync(join(tmpdir(), 'bubbles-gmail-'))
const dbPath = join(tempDir, 'gmail-test.sqlite')

process.env.BUBBLES_MAIL_DB_PATH = dbPath
process.env.NUXT_GOOGLE_CLIENT_ID ||= 'test-client-id.apps.googleusercontent.com'
process.env.NUXT_GOOGLE_CLIENT_SECRET ||= 'test-client-secret'
process.env.NUXT_GOOGLE_REDIRECT_URI ||= 'http://localhost:3000/api/gmail/callback'

const { closeDbForTests } = await import('../server/db/client')
const { getBubblesDbPath } = await import('../server/db/path')
const { createGmailAuthUrl } = await import('../server/utils/gmail/oauth')
const {
  consumeOauthState,
  getStoredGmailMessage,
  listStoredGmailMessages,
  updateStoredMessageLabels,
  upsertGmailAccount,
  upsertGmailMessage,
} = await import('../server/utils/gmail/repository')
const { buildRawEmail, encodeBase64Url, parseGmailMessage } = await import('../server/utils/gmail/message')

try {
  assert.equal(getBubblesDbPath(), dbPath)

  const oauth = await createGmailAuthUrl({ redirectAfter: '/after-connect' })
  assert.match(oauth.authUrl, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
  assert.match(oauth.authUrl, /gmail\.send/)

  const state = new URL(oauth.authUrl).searchParams.get('state')
  assert.ok(state)

  const consumedState = await consumeOauthState(state)
  assert.equal(consumedState?.redirectAfter, '/after-connect')

  const account = await upsertGmailAccount({
    id: 'acct_test',
    email: 'alicia@example.com',
    googleUserId: 'google-user-1',
    displayName: 'Alicia',
    avatarUrl: null,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    expiryDate: new Date(Date.now() + 60_000),
  })

  const parsed = parseGmailMessage(account.id, {
    id: 'gmail-message-1',
    threadId: 'thread-1',
    historyId: 'history-1',
    internalDate: String(Date.now()),
    labelIds: ['INBOX', 'UNREAD'],
    snippet: 'Hello from Gmail',
    sizeEstimate: 2048,
    payload: {
      mimeType: 'text/plain',
      body: { data: encodeBase64Url('Hello body') },
      headers: [
        { name: 'From', value: 'William Smith <william@example.com>' },
        { name: 'To', value: 'Alicia <alicia@example.com>' },
        { name: 'Subject', value: 'Meeting Tomorrow' },
        { name: 'Message-ID', value: '<message-1@example.com>' },
      ],
    },
  })

  await upsertGmailMessage(parsed)

  const messages = await listStoredGmailMessages({ accountId: account.id, limit: 10 })
  assert.equal(messages.length, 1)
  assert.equal(messages[0].subject, 'Meeting Tomorrow')
  assert.equal(messages[0].unread, true)
  assert.equal(messages[0].bodyText, 'Hello body')

  await updateStoredMessageLabels(account.id, 'gmail-message-1', ['INBOX', 'STARRED'])

  const updated = await getStoredGmailMessage(account.id, 'gmail-message-1')
  assert.equal(updated?.starred, true)
  assert.equal(updated?.unread, false)

  const raw = buildRawEmail({
    to: ['bob@example.com'],
    cc: ['team@example.com'],
    subject: 'Sprint Review',
    bodyText: 'Looks good.',
    inReplyTo: '<message-1@example.com>',
  })
  const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

  assert.match(decoded, /To: bob@example\.com/)
  assert.match(decoded, /Cc: team@example\.com/)
  assert.match(decoded, /Subject: Sprint Review/)
  assert.match(decoded, /Looks good\./)

  console.log('Gmail API local integration check passed')
} finally {
  closeDbForTests()
  rmSync(tempDir, { recursive: true, force: true })
}
