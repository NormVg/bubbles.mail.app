import { streamText, stepCountIs } from 'ai'
import { ollama } from 'ai-sdk-ollama'
import { createSearchEmailsTool, createReadEmailTool, createManageEmailTool, createStageEmailsForSendingTool } from './tools'

interface ChatAgentOptions {
  modelName: string
  system: string
  prompt?: string
  messages?: any[]
  accountId: string
  maxSteps?: number
  abortSignal: AbortSignal
}

export async function createChatStream(options: ChatAgentOptions) {
  const { modelName, system, prompt, messages, accountId, maxSteps = 5, abortSignal } = options

  // Provide the tools to the agent with the current user's account context
  const tools = {
    searchEmails: createSearchEmailsTool(accountId),
    readEmail: createReadEmailTool(accountId),
    manageEmail: createManageEmailTool(accountId),
    stageEmailsForSending: createStageEmailsForSendingTool(accountId)
  }

  if (messages) {
    return await streamText({
      model: ollama(modelName, { think: true }),
      system,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      abortSignal,
      providerOptions: { ollama: { think: true } }
    })
  }

  return await streamText({
    model: ollama(modelName, { think: true }),
    system,
    prompt: prompt || '',
    tools,
    stopWhen: stepCountIs(maxSteps),
    abortSignal,
    providerOptions: { ollama: { think: true } }
  })
}
