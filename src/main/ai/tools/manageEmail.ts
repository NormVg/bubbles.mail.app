import { tool } from 'ai'
import { z } from 'zod'
import { applyGmailMessageAction } from '../../utils/gmail/service'

export const createManageEmailTool = (accountId: string) => tool({
  description: 'Manage an email in the user\'s inbox. You can archive, trash, mark as read, or mark as unread.',
  parameters: z.object({
    messageId: z.string().describe('The ID of the email to manage.'),
    action: z.enum(['archive', 'trash', 'markRead', 'markUnread']).describe('The action to perform on the email.'),
    targetAccountId: z.string().optional().describe('The account ID the email belongs to. If omitted, uses the active account.')
  }),
  execute: async ({ messageId, action, targetAccountId }) => {
    const finalAccountId = targetAccountId || accountId
    if (!finalAccountId) {
      return { error: 'No account ID provided or found. Cannot manage email.' }
    }
    
    try {
      await applyGmailMessageAction({
        accountId: finalAccountId,
        messageId,
        action
      })
      
      return { success: true, message: `Successfully applied action '${action}' to email ${messageId}.` }
    } catch (e: any) {
      return { error: `Failed to manage email: ${e.message}` }
    }
  }
})
