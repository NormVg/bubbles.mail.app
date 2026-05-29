import { tool } from 'ai'
import { z } from 'zod'
import { listCachedMessages } from '../../utils/gmail/service'

export const createSearchEmailsTool = (accountId: string) => tool({
  description: 'Search the user\'s inbox for emails matching a query. Returns a list of matching emails with their IDs, subjects, and snippets.',
  parameters: z.object({
    query: z.string().describe('The search query. Supports exact keywords, quoted phrases ("zo computer"), and Gmail syntax like "from:john", "subject:meeting", "is:unread", "is:read", "newer_than:5d", or "older_than:10d". Separate multiple conditions with spaces.'),
    limit: z.number().optional().describe('Maximum number of results to return. Default is 10. You can increase this up to 50 if you need to fetch a large batch of emails to answer the user.')
  }),
  execute: async ({ query, limit }) => {
    try {
      const results = await listCachedMessages({
        accountId: accountId || undefined, // If null/undefined, searches all accounts
        q: query,
        limit: limit || 10
      })
      
      return results.map(msg => ({
        id: msg.id,
        accountId: msg.accountId, // Ensure LLM knows which account this belongs to
        sender: msg.sender,
        subject: msg.subject,
        snippet: msg.snippet,
        timestamp: msg.timestamp,
        isUnread: msg.isUnread
      }))
    } catch (e: any) {
      return { error: `Failed to search emails: ${e.message}` }
    }
  }
})
