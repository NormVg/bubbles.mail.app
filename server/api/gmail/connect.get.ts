import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { GMAIL_SCOPES, createGmailAuthUrl } from '../../utils/gmail/oauth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  try {
    const redirectAfter = typeof query.redirectAfter === 'string' ? query.redirectAfter : null
    const result = await createGmailAuthUrl({ redirectAfter })

    if (query.redirect === '1' || query.redirect === 'true') {
      return sendRedirect(event, result.authUrl)
    }

    return {
      authUrl: result.authUrl,
      expiresAt: result.expiresAt,
      scopes: GMAIL_SCOPES,
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to start Gmail OAuth flow.',
    })
  }
})
