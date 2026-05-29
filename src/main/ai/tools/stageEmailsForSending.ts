import { tool } from 'ai'
import { z } from 'zod'

export const createStageEmailsForSendingTool = (accountId: string) => tool({
  description: 'Stage one or multiple emails to be sent by the user. Use this when the user asks you to draft or send emails. The emails will be staged in the UI for the user to review and send with a single click.',
  parameters: z.object({
    emails: z.array(z.object({
      to: z.array(z.string()).optional().describe('List of recipient email addresses. Use this parameter.'),
      recipient: z.string().optional().describe('Fallback for recipient email address.'),
      subject: z.string().describe('The subject line of the email.'),
      bodyText: z.string().optional().describe('The plain text body of the email. Keep it professional and concise.'),
      body: z.string().optional().describe('Fallback for email body.'),
      inReplyTo: z.string().optional().describe('The message ID this email is replying to, if any.'),
      threadId: z.string().optional().describe('The thread ID this email belongs to, if any.'),
      from: z.string().optional().describe('The email address to send this email from. If omitted, uses the active account.')
    })).describe('An array of emails to stage for sending.')
  }),
  execute: async ({ emails }) => {
    if (!accountId) {
      return { error: 'No account ID provided. Cannot stage emails.' }
    }
    
    // We don't actually send them here. We just return a success message indicating they are staged.
    // The Vercel AI SDK will include this tool call and result in the message history,
    // and the frontend will detect the `stageEmailsForSending` tool call and render the UI.
    return { 
      success: true, 
      message: `Successfully staged ${emails.length} emails for user review.`,
      stagedCount: emails.length
    }
  }
})
