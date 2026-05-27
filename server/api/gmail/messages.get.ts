import { createError, defineEventHandler, getQuery } from 'h3'
import { listCachedMessages } from '../../utils/gmail/service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : undefined
  const before = query.before ? Number(query.before) : undefined

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    throw createError({ statusCode: 400, message: 'limit must be an integer between 1 and 100.' })
  }

  if (before !== undefined && !Number.isFinite(before)) {
    throw createError({ statusCode: 400, message: 'before must be a timestamp in milliseconds.' })
  }

  return listCachedMessages({
    accountId: typeof query.accountId === 'string' ? query.accountId : undefined,
    q: typeof query.q === 'string' ? query.q : undefined,
    limit,
    before,
  })
})
