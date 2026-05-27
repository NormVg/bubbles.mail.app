import { createError, defineEventHandler, getRouterParam } from 'h3'
import { deleteGmailAccount } from '../../../utils/gmail/repository'

export default defineEventHandler(async (event) => {
  const accountId = getRouterParam(event, 'accountId')

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'Missing accountId.' })
  }

  const deleted = await deleteGmailAccount(accountId)

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Gmail account not found.' })
  }

  return { success: true }
})
