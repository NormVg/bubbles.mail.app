import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { readGmailMessage } from '../../../utils/gmail/service'

export default defineEventHandler(async (event) => {
  const messageId = getRouterParam(event, 'messageId')
  const query = getQuery(event)
  const accountId = typeof query.accountId === 'string' ? query.accountId : ''

  if (!messageId) {
    throw createError({ statusCode: 400, message: 'Missing messageId.' })
  }

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'Missing accountId query parameter.' })
  }

  const message = await readGmailMessage({
    accountId,
    messageId,
    refresh: query.refresh === '1' || query.refresh === 'true',
  })

  if (!message) {
    throw createError({ statusCode: 404, message: 'Gmail message not found.' })
  }

  return message
})
