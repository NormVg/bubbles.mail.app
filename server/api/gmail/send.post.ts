import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { sendGmailMessage } from '../../utils/gmail/service'

const recipientsSchema = z.union([z.string(), z.array(z.string())]).transform((value) => {
  const items = Array.isArray(value) ? value : [value]
  return items.map((item) => item.trim()).filter(Boolean)
})

const sendSchema = z
  .object({
    accountId: z.string().min(1),
    to: recipientsSchema.refine((value) => value.length > 0, 'At least one recipient is required.'),
    cc: recipientsSchema.optional(),
    bcc: recipientsSchema.optional(),
    subject: z.string().min(1),
    bodyText: z.string().optional(),
    bodyHtml: z.string().optional(),
    threadId: z.string().optional(),
    inReplyTo: z.string().optional(),
    references: z.string().optional(),
  })
  .refine((value) => Boolean(value.bodyText?.trim() || value.bodyHtml?.trim()), {
    message: 'bodyText or bodyHtml is required.',
  })

export default defineEventHandler(async (event) => {
  const result = sendSchema.safeParse(await readBody(event))

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid Gmail send request.', data: result.error.flatten() })
  }

  try {
    const { accountId, ...payload } = result.data
    return await sendGmailMessage(accountId, payload)
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to send Gmail message.',
    })
  }
})
