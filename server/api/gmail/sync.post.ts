import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { syncGmailMessages } from '../../utils/gmail/service'

const syncSchema = z.object({
  accountId: z.string().min(1),
  label: z.string().optional(),
  q: z.string().optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
  pageToken: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const result = syncSchema.safeParse(await readBody(event))

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid Gmail sync request.', data: result.error.flatten() })
  }

  try {
    return await syncGmailMessages(result.data)
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to sync Gmail messages.',
    })
  }
})
