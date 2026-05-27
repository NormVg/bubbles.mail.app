import type { gmail_v1 } from 'googleapis'
import type { NewGmailMessageRecord } from '../../db/schema'

export type EmailAddress = {
  name?: string
  email: string
  raw: string
}

export type SendEmailPayload = {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  threadId?: string
  inReplyTo?: string
  references?: string
}

export type StoredMessage = {
  id: string
  accountId: string
  gmailMessageId: string
  threadId: string
  subject: string
  snippet: string
  sender: string
  senderEmail: string
  timestamp: number | null
  unread: boolean
  starred: boolean
  labels: string[]
  to: EmailAddress[]
  cc: EmailAddress[]
  bcc: EmailAddress[]
  replyTo: string | null
  bodyText: string | null
  bodyHtml: string | null
  inReplyTo: string | null
  references: string | null
}

type GmailHeader = {
  name?: string | null
  value?: string | null
}

export function parseMessageHeaders(headers: GmailHeader[] = []) {
  const get = (name: string) =>
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value?.trim() || ''

  return {
    subject: get('Subject'),
    from: get('From'),
    to: get('To'),
    cc: get('Cc'),
    bcc: get('Bcc'),
    replyTo: get('Reply-To'),
    date: get('Date'),
    messageId: get('Message-ID'),
    inReplyTo: get('In-Reply-To'),
    references: get('References'),
  }
}

export function parseAddressList(value = ''): EmailAddress[] {
  if (!value.trim()) return []

  return value
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
      if (!match) return { email: raw, raw }

      const name = match[1].replace(/^"|"$/g, '').trim()
      return {
        name: name || undefined,
        email: match[2].trim(),
        raw,
      }
    })
}

export function decodeBase64Url(data?: string | null) {
  if (!data) return ''

  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf8')
}

function findMimePart(payload: gmail_v1.Schema$MessagePart | undefined, mimeType: string): string {
  if (!payload) return ''

  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  for (const part of payload.parts || []) {
    const found = findMimePart(part, mimeType)
    if (found) return found
  }

  return ''
}

export function parseGmailMessage(accountId: string, message: gmail_v1.Schema$Message): NewGmailMessageRecord {
  if (!message.id || !message.threadId) {
    throw new Error('Gmail message is missing id or threadId')
  }

  const headers = parseMessageHeaders(message.payload?.headers || [])
  const from = parseAddressList(headers.from)[0]
  const labelIds = message.labelIds || []
  const now = new Date()
  const bodyHtml = findMimePart(message.payload, 'text/html')
  const bodyText = findMimePart(message.payload, 'text/plain') || decodeBase64Url(message.payload?.body?.data)
  const internalTimestamp = Number(message.internalDate || 0)

  return {
    id: `${accountId}:${message.id}`,
    accountId,
    gmailMessageId: message.id,
    threadId: message.threadId,
    historyId: message.historyId || null,
    internalDate: internalTimestamp > 0 ? new Date(internalTimestamp) : null,
    subject: headers.subject || '(no subject)',
    snippet: message.snippet || '',
    fromName: from?.name || null,
    fromEmail: from?.email || null,
    toJson: JSON.stringify(parseAddressList(headers.to)),
    ccJson: JSON.stringify(parseAddressList(headers.cc)),
    bccJson: JSON.stringify(parseAddressList(headers.bcc)),
    replyTo: headers.replyTo || headers.from || null,
    messageIdHeader: headers.messageId || null,
    inReplyTo: headers.inReplyTo || null,
    referencesHeader: headers.references || null,
    bodyText: bodyText || null,
    bodyHtml: bodyHtml || null,
    labelIdsJson: JSON.stringify(labelIds),
    isUnread: labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    sizeEstimate: message.sizeEstimate || null,
    syncedAt: now,
    updatedAt: now,
  }
}

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toStoredMessage(record: {
  id: string
  accountId: string
  gmailMessageId: string
  threadId: string
  subject: string
  snippet: string
  fromName: string | null
  fromEmail: string | null
  internalDate: Date | null
  isUnread: boolean
  isStarred: boolean
  labelIdsJson: string
  toJson: string
  ccJson: string
  bccJson: string
  replyTo: string | null
  bodyText: string | null
  bodyHtml: string | null
  inReplyTo: string | null
  referencesHeader: string | null
}): StoredMessage {
  return {
    id: record.id,
    accountId: record.accountId,
    gmailMessageId: record.gmailMessageId,
    threadId: record.threadId,
    subject: record.subject,
    snippet: record.snippet,
    sender: record.fromName || record.fromEmail || 'Unknown Sender',
    senderEmail: record.fromEmail || '',
    timestamp: record.internalDate?.getTime() || null,
    unread: record.isUnread,
    starred: record.isStarred,
    labels: parseJsonArray<string>(record.labelIdsJson),
    to: parseJsonArray<EmailAddress>(record.toJson),
    cc: parseJsonArray<EmailAddress>(record.ccJson),
    bcc: parseJsonArray<EmailAddress>(record.bccJson),
    replyTo: record.replyTo,
    bodyText: record.bodyText,
    bodyHtml: record.bodyHtml,
    inReplyTo: record.inReplyTo,
    references: record.referencesHeader,
  }
}

export function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function joinRecipients(values?: string[]) {
  return (values || []).map(sanitizeHeader).filter(Boolean).join(', ')
}

export function buildRawEmail(payload: SendEmailPayload) {
  const lines: string[] = [
    `To: ${joinRecipients(payload.to)}`,
    `Subject: ${sanitizeHeader(payload.subject)}`,
    'MIME-Version: 1.0',
  ]

  if (payload.cc?.length) lines.push(`Cc: ${joinRecipients(payload.cc)}`)
  if (payload.bcc?.length) lines.push(`Bcc: ${joinRecipients(payload.bcc)}`)
  if (payload.inReplyTo) lines.push(`In-Reply-To: ${sanitizeHeader(payload.inReplyTo)}`)
  if (payload.references) lines.push(`References: ${sanitizeHeader(payload.references)}`)

  if (payload.bodyHtml && payload.bodyText) {
    const boundary = `bubbles-${crypto.randomUUID()}`
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`, '')
    lines.push(`--${boundary}`)
    lines.push('Content-Type: text/plain; charset="UTF-8"', '', payload.bodyText)
    lines.push(`--${boundary}`)
    lines.push('Content-Type: text/html; charset="UTF-8"', '', payload.bodyHtml)
    lines.push(`--${boundary}--`)
    return encodeBase64Url(lines.join('\r\n'))
  }

  const contentType = payload.bodyHtml ? 'text/html' : 'text/plain'
  lines.push(`Content-Type: ${contentType}; charset="UTF-8"`, '', payload.bodyHtml || payload.bodyText || '')
  return encodeBase64Url(lines.join('\r\n'))
}
