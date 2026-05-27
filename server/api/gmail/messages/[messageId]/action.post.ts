import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { applyGmailMessageAction } from '../../../../utils/gmail/service'

const actionSchema = z.object({
  accountId: z.string().min(1),
  action: z.enum(['archive', 'trash', 'star', 'unstar', 'markRead', 'markUnread']),
})

export default defineEventHandler(async (event) => {
  const messageId = getRouterParam(event, 'messageId')
  const result = actionSchema.safeParse(await readBody(event))

  if (!messageId) {
    throw createError({ statusCode: 400, message: 'Missing messageId.' })
  }

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid Gmail action request.', data: result.error.flatten() })
  }

  return applyGmailMessageAction({
    accountId: result.data.accountId,
    messageId,
    action: result.data.action,
  })
})
