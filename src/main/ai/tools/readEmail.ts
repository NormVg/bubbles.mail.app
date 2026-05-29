import { tool } from 'ai'
import { z } from 'zod'
import { readGmailMessage } from '../../utils/gmail/service'

export const createReadEmailTool = (accountId: string) => tool({
  description: 'Read the full body and details of a specific email by its ID. Use this when you need to understand the full context of an email.',
  parameters: z.object({
    messageId: z.string().describe('The ID of the email to read.'),
    targetAccountId: z.string().optional().describe('The account ID the email belongs to (found in search results). If omitted, uses the active account.')
  }),
  execute: async ({ messageId, targetAccountId }) => {
    const finalAccountId = targetAccountId || accountId
    if (!finalAccountId) {
      return { error: 'No account ID provided or found. Cannot read email.' }
    }
    
    try {
      const message = await readGmailMessage({
        accountId: finalAccountId,
        messageId,
        refresh: false
      })
      
      if (!message) {
        return { error: 'Email not found.' }
      }
      
      return {
        id: message.id,
        sender: message.sender,
        subject: message.subject,
        body: message.body, // Contains the full text body
        timestamp: message.timestamp,
        isUnread: message.isUnread,
        threadId: message.threadId,
        labels: message.labels
      }
    } catch (e: any) {
      return { error: `Failed to read email: ${e.message}` }
    }
  }
})
