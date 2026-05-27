import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { connectGmailAccountFromCallback } from '../../utils/gmail/service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (query.error) {
    return sendRedirect(event, `/?gmail_error=${encodeURIComponent(String(query.error))}`)
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''

  if (!code || !state) {
    throw createError({ statusCode: 400, message: 'Missing Gmail OAuth code or state.' })
  }

  try {
    const { account, redirectAfter } = await connectGmailAccountFromCallback(code, state)
    const target = redirectAfter || `/?gmail_connected=${encodeURIComponent(account.email)}`

    return sendRedirect(event, target)
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to complete Gmail OAuth flow.',
    })
  }
})
