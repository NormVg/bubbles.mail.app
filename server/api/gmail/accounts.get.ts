import { defineEventHandler } from 'h3'
import { listGmailAccounts } from '../../utils/gmail/repository'

export default defineEventHandler(async () => {
  return listGmailAccounts()
})
