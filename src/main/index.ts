import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import http from 'http'
import { parse } from 'url'

// Load environment variables from .env file if it exists
function loadEnv() {
  const envPath = join(process.cwd(), '.env')
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf8')
      content.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          const val = valueParts.join('=').trim()
          process.env[key.trim()] = val.replace(/^['"]|['"]$/g, '')
        }
      })
      console.log('[Electron Main] Loaded environment variables from .env')
    } catch (e) {
      console.error('[Electron Main] Failed to read .env file:', e)
    }
  }
}
loadEnv()

// Database client & schema initialization (runs migrations automatically on load)
import { getSqliteConnection } from './db/client'
import { listGmailAccounts, deleteGmailAccount } from './utils/gmail/repository'
import { createGmailAuthUrl } from './utils/gmail/oauth'
import { connectGmailAccountFromCallback, listCachedMessages, sendGmailMessage, syncGmailMessages, readGmailMessage, applyGmailMessageAction } from './utils/gmail/service'

import { ollama } from 'ai-sdk-ollama'
import { streamText, generateText, Output } from 'ai'
import { z } from 'zod'
import { SarvamAIClient } from 'sarvamai'

// We initialize SQLite database on app load
getSqliteConnection()

const boundsFilePath = join(app.getPath('userData'), 'window-state.json')

function getWindowBounds(): { width: number, height: number, x?: number, y?: number } {
  const defaultBounds = { width: 1200, height: 800 }
  try {
    if (existsSync(boundsFilePath)) {
      const data = JSON.parse(readFileSync(boundsFilePath, 'utf8'))
      return { ...defaultBounds, ...data }
    }
  } catch (e) {
    console.error('[Electron] Failed to load window bounds:', e)
  }
  return defaultBounds
}

function saveWindowBounds(bounds: { width: number, height: number, x?: number, y?: number }) {
  try {
    writeFileSync(boundsFilePath, JSON.stringify(bounds), 'utf8')
  } catch (e) {
    console.error('[Electron] Failed to save window bounds:', e)
  }
}

function createMenu() {
  const template: any[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Spawns a local HTTP server in the main process to handle Google OAuth callback redirects
function startOAuthCallbackServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = parse(req.url || '', true)
    const { pathname, query } = parsedUrl

    if (pathname === '/api/gmail/callback' || pathname === '/api/auth/callback/google') {
      const code = typeof query.code === 'string' ? query.code : ''
      const state = typeof query.state === 'string' ? query.state : ''

      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<h1>Error</h1><p>Missing OAuth code or state.</p>')
        return
      }

      try {
        const { account } = await connectGmailAccountFromCallback(code, state)

        // Broadcast success to the Vue frontend renderer
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('oauth-success', account.email)
        })

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Gmail Connected</title>
              <style>
                body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-align: center; background: #fff; }
                h1 { margin: 0 0 8px; font-size: 22px; color: #222; }
                p { margin: 0; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div>
                <h1>Gmail Connected!</h1>
                <p>${account.email} has been successfully connected. You can close this tab and return to Bubbles.mail.</p>
              </div>
              <script>
                setTimeout(() => window.close(), 1500)
              </script>
            </body>
          </html>
        `)
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end(`<h1>Authentication Failed</h1><p>${err.message || err}</p>`)
      }
      return
    }



    res.writeHead(404)
    res.end()
  })

  server.on('error', (err: any) => {
    console.error('[Electron] OAuth callback server error:', err.message)
    if (err.code === 'EADDRINUSE') {
      console.warn('[Electron] Port 9944 is already in use by another process. OAuth callback might not work. Please free port 9944.')
    }
  })

  server.listen(9944, 'localhost', () => {
    console.log('[Electron] OAuth callback server listening on http://localhost:9944')
  })

  app.on('before-quit', () => {
    server.close()
  })
}

function createWindow(): void {
  const bounds = getWindowBounds()

  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  const saveState = () => {
    const b = mainWindow.getBounds()
    saveWindowBounds({
      width: b.width,
      height: b.height,
      x: b.x,
      y: b.y
    })
  }

  mainWindow.on('resize', saveState)
  mainWindow.on('move', saveState)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load standard Vite/Dev server URL in development, or local compiled file in production
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.vishnu-mac.bubbles.mail')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMenu()
  startOAuthCallbackServer()

  // Register main IPC API Router
  ipcMain.handle('api-request', async (_, path: string, options: any = {}) => {
    try {
      const cleanPath = path.split('?')[0]
      const method = options.method || 'GET'

      console.log(`[Electron IPC] API Router: ${method} ${path}`)

      // AI Transcribe POST /api/ai/transcribe
      if (cleanPath === '/api/ai/transcribe' && method === 'POST') {
        const body = options.body || {}
        if (!body.audioBase64) throw new Error('Missing audioBase64')
        const apiKey = body.apiKey || process.env.SARVAM_API_KEY || "YOUR_SARVAM_API_KEY"

        console.log(`[Sarvam] Starting transcription using key: ${apiKey.substring(0, 5)}...`)

        const client = new SarvamAIClient({
          apiSubscriptionKey: apiKey
        })

        try {
          const fs = require('fs')
          const path = require('path')
          const os = require('os')

          const tempFilePath = path.join(os.tmpdir(), `dictation_${Date.now()}.webm`)
          fs.writeFileSync(tempFilePath, Buffer.from(body.audioBase64, 'base64'))
          console.log(`[Sarvam] Saved temp audio file to ${tempFilePath}`)

          const response = await client.speechToText.transcribe({
            file: fs.createReadStream(tempFilePath),
            language_code: "en-IN",
            model: "saaras:v3"
          } as any)

          fs.unlinkSync(tempFilePath)
          console.log(`[Sarvam] Transcription successful:`, response)

          return { text: response.transcript || (response as any).text || '' }
        } catch (error: any) {
          console.error(`[Sarvam] Transcription error:`, error)
          throw error
        }
      }

      // AI Models GET /api/ai/models
      if (cleanPath === '/api/ai/models' && method === 'GET') {
        try {
          const res = await fetch('http://localhost:11434/api/tags')
          if (!res.ok) {
            throw new Error(`Ollama returned status ${res.status}`)
          }
          const data = (await res.json()) as any
          return data.models?.map((m: any) => ({ name: m.name, size: m.size })) || []
        } catch (err: any) {
          console.warn('[Electron IPC] Failed to fetch Ollama models:', err.message)
          return []
        }
      }

      // AI Model Show POST /api/ai/show
      if (cleanPath === '/api/ai/show' && method === 'POST') {
        const body = options.body || {}
        if (!body.name) return { vision: false, thinking: false }
        try {
          const res = await fetch('http://localhost:11434/api/show', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: body.name })
          })
          if (res.ok) {
            const data = await res.json() as any
            if (data.capabilities) {
              return {
                vision: data.capabilities.includes('vision'),
                thinking: data.capabilities.includes('thinking')
              }
            }
          }
        } catch (e: any) {
          console.warn('[Electron IPC] Failed to fetch capabilities from Ollama API:', e.message)
        }
        return { vision: false, thinking: false }
      }

      // AI Digest POST /api/ai/digest
      if (cleanPath === '/api/ai/digest' && method === 'POST') {
        const body = options.body || {}
        if (!body.emails || !Array.isArray(body.emails)) throw new Error('Missing emails array')
        if (!body.model) throw new Error('No AI model selected in settings.')

        console.log(`[Electron IPC] Generating AI Digest for ${body.emails.length} emails using ${body.model}...`)

        const digestSchema = z.object({
          summary: z.array(z.string()).describe("A high-level bulleted summary of the day's important emails."),
          tasks: z.array(z.object({
            text: z.string(),
            sourceEmailId: z.string()
          })).describe("Actionable tasks extracted from emails."),
          deadlines: z.array(z.object({
            text: z.string(),
            urgency: z.enum(['high', 'medium', 'low']),
            sourceEmailId: z.string()
          })).describe("Important deadlines or time-sensitive events."),
          threads: z.array(z.object({
            who: z.string(),
            topic: z.string(),
            summary: z.string(),
            status: z.string(),
            sourceEmailId: z.string()
          })).describe("Important email threads or conversations."),
          insights: z.array(z.string()).describe("Key takeaways, tone analysis, or important patterns.")
        })

        const digestSystemPrompt = "You are an intelligent executive email assistant. Your job is to analyze the user's daily emails and generate a structured Daily Digest report. Keep summaries short, professional, and highly actionable.\n\nYou MUST return a JSON object with EXACTLY these keys and structures:\n- summary: string[] (bullet points)\n- tasks: { text: string, sourceEmailId: string }[]\n- deadlines: { text: string, urgency: \"high\"|\"medium\"|\"low\", sourceEmailId: string }[]\n- threads: { who: string, topic: string, summary: string, status: string, sourceEmailId: string }[]\n- insights: string[]\n\nCRITICAL: Use ONLY these exact field names. 'text' not 'description' or 'task'. 'urgency' must be exactly 'high', 'medium', or 'low'. For 'sourceEmailId', use the exact 'id' from the input email. Do NOT wrap in markdown fences."

        const digestPrompt = `Emails to analyze:\n${JSON.stringify(body.emails)}`

        // Helper: attempt to repair a raw LLM response into our schema
        function repairDigestResponse(rawText: string): any | null {
          try {
            // Strip markdown fences if present
            let cleaned = rawText.trim()
            if (cleaned.startsWith('```')) {
              cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
            }
            const parsed = JSON.parse(cleaned)

            // Map misnamed fields to the correct schema
            const summary = parsed.summary || parsed.executiveSummary || []
            const rawTasks = parsed.tasks || parsed.actionItems || parsed.action_items || []
            const rawDeadlines = parsed.deadlines || []
            const rawThreads = parsed.threads || parsed.activeThreads || parsed.active_threads || []
            const insights = parsed.insights || parsed.observations || []

            const tasks = rawTasks.map((t: any) => ({
              text: t.text || t.description || t.task || String(t),
              sourceEmailId: t.sourceEmailId || t.source_email_id || t.emailId || ''
            }))

            const coerceUrgency = (val: any): 'high' | 'medium' | 'low' => {
              const s = String(val || '').toLowerCase()
              if (s.includes('high') || s.includes('urgent') || s.includes('immediate')) return 'high'
              if (s.includes('low') || s.includes('minor')) return 'low'
              return 'medium'
            }

            const deadlines = rawDeadlines.map((d: any) => ({
              text: d.text || d.description || d.deadline || String(d),
              urgency: coerceUrgency(d.urgency || d.priority),
              sourceEmailId: d.sourceEmailId || d.source_email_id || d.emailId || ''
            }))

            const threads = rawThreads.map((t: any) => ({
              who: t.who || t.participants?.join?.(', ') || t.sender || t.from || 'Unknown',
              topic: t.topic || t.subject || t.title || 'General',
              summary: t.summary || t.description || '',
              status: t.status || 'Active',
              sourceEmailId: t.sourceEmailId || t.source_email_id || t.emailId || ''
            }))

            return { summary, tasks, deadlines, threads, insights }
          } catch (e) {
            return null
          }
        }

        const MAX_RETRIES = 3
        let lastError: any = null

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          console.log(`[Electron IPC] Digest generation attempt ${attempt}/${MAX_RETRIES}...`)
          try {
            const result = await generateText({
              model: ollama(body.model),
              output: Output.object({ schema: digestSchema }),
              system: digestSystemPrompt,
              prompt: digestPrompt
            })
            console.log(`[Electron IPC] Digest generation complete on attempt ${attempt}.`)
            return result.output
          } catch (error: any) {
            lastError = error
            console.warn(`[Electron IPC] Digest attempt ${attempt} failed:`, error.message || error)

            // Try to repair from the raw text in the error
            const rawText = error?.text || error?.cause?.text
            if (rawText) {
              console.log(`[Electron IPC] Attempting manual JSON repair...`)
              const repaired = repairDigestResponse(rawText)
              if (repaired) {
                console.log(`[Electron IPC] Manual repair successful!`)
                return repaired
              }
            }
          }
        }

        console.error(`[Electron IPC] All ${MAX_RETRIES} digest attempts failed.`)
        throw lastError
      }

      // 1. GET /api/gmail/accounts
      if (cleanPath === '/api/gmail/accounts' && method === 'GET') {
        const result = await listGmailAccounts()
        console.log(`[Electron IPC] Accounts returned: ${result.length} accounts`)
        return result
      }
      // AI Email Summary POST /api/ai/summary
      if (cleanPath === '/api/ai/summary' && method === 'POST') {
        const body = options.body || {}
        console.log(`[AI Summary] Started summary generation for model: ${body.model}`)
        
        if (!body.emailBody) throw new Error('Missing emailBody')
        if (!body.model) throw new Error('No AI model selected')

        let attempts = 0
        const maxAttempts = 3
        let finalReport = null

        while (attempts < maxAttempts) {
          attempts++
          console.log(`[AI Summary] Attempt ${attempts}...`)
          try {
            const { output, text } = await generateText({
              model: ollama(body.model),
              system: `You are an executive email assistant. Analyze this email and return a structured JSON summary.
Do NOT wrap your response in markdown code blocks (\`\`\`json). Output raw, parseable JSON only.
You MUST strictly use the exact keys from the schema:
- keyPoints: Array of 1 to 3 strings highlighting the main takeaways.
- hasActionItems: boolean
- hasMeeting: boolean
- hasDeadline: boolean
- readTime: number (estimated minutes to read)`,
              prompt: `Email content:\n\n${body.emailBody}`,
              output: Output.object({
                schema: z.object({
                  keyPoints: z.array(z.string()),
                  hasActionItems: z.boolean(),
                  hasMeeting: z.boolean(),
                  hasDeadline: z.boolean(),
                  readTime: z.number()
                })
              }),
              mode: 'json'
            })
            console.log(`[AI Summary] Attempt ${attempts} raw text:`, text)
            console.log(`[AI Summary] Attempt ${attempts} parsed output:`, output)
            finalReport = output
            break // Success, exit loop
          } catch (e: any) {
            console.warn(`[AI Summary] Attempt ${attempts} failed. Error:`, e.message)
            console.warn(`[AI Summary] Attempt ${attempts} error raw text:`, e.text || 'No raw text in error')
            
            if (e.text) {
              try {
                // Manual repair fallback
                console.log(`[AI Summary] Attempting manual JSON repair fallback...`)
                let text = e.text.trim()
                if (text.startsWith('```json')) text = text.replace(/^```json\n?/, '')
                if (text.startsWith('```')) text = text.replace(/^```\n?/, '')
                if (text.endsWith('```')) text = text.replace(/\n?```$/, '')

                const parsed = JSON.parse(text)
                
                // Map common mistakes
                const safeReport = {
                  keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [parsed.summary || parsed.text || 'Email summarized'],
                  hasActionItems: Boolean(parsed.hasActionItems || parsed.actionItems || parsed.actions),
                  hasMeeting: Boolean(parsed.hasMeeting || parsed.meeting),
                  hasDeadline: Boolean(parsed.hasDeadline || parsed.deadline),
                  readTime: Number(parsed.readTime || 1) || 1
                }
                
                console.log(`[AI Summary] Manual repair successful:`, safeReport)
                finalReport = safeReport
                break // Repair successful, exit loop
              } catch (repairErr) {
                console.warn(`[AI Summary] Repair failed:`, repairErr)
              }
            }
            if (attempts === maxAttempts) {
              console.error(`[AI Summary] Max attempts reached. Throwing error.`)
              throw new Error(`AI generation failed after ${maxAttempts} attempts: ${e.message}`)
            }
          }
        }

        console.log(`[AI Summary] Returning final report`)
        return finalReport
      }

      // 2. DELETE /api/gmail/accounts/[accountId]
      if (cleanPath.startsWith('/api/gmail/accounts/') && method === 'DELETE') {
        const parts = cleanPath.split('/')
        const accountId = parts[parts.length - 1]
        const deleted = await deleteGmailAccount(accountId)
        if (!deleted) throw new Error('Account not found')
        return { success: true }
      }

      // 3. GET /api/gmail/connect
      if (cleanPath === '/api/gmail/connect' && method === 'GET') {
        const redirectAfter = options.query?.redirectAfter || null
        const result = await createGmailAuthUrl({ redirectAfter })
        return {
          authUrl: result.authUrl,
          expiresAt: result.expiresAt,
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
          ]
        }
      }

      // 4. GET /api/gmail/messages
      if (cleanPath === '/api/gmail/messages' && method === 'GET') {
        const q = options.query || {}
        const result = await listCachedMessages({
          accountId: q.accountId,
          q: q.q,
          limit: q.limit ? Number(q.limit) : undefined,
          before: q.before ? Number(q.before) : undefined
        })
        console.log(`[Electron IPC] Messages returned: ${result.length} messages`)
        return result
      }

      // 5. GET /api/gmail/messages/[messageId]
      if (cleanPath.startsWith('/api/gmail/messages/') && !cleanPath.endsWith('/action') && method === 'GET') {
        const parts = cleanPath.split('/')
        const messageId = parts[parts.length - 1]
        const accountId = options.query?.accountId
        if (!accountId) throw new Error('Missing accountId query parameter')

        const message = await readGmailMessage({
          accountId,
          messageId,
          refresh: options.query?.refresh === '1' || options.query?.refresh === 'true'
        })
        if (!message) throw new Error('Message not found')
        return message
      }

      // 6. POST /api/gmail/messages/[messageId]/action
      if (cleanPath.startsWith('/api/gmail/messages/') && cleanPath.endsWith('/action') && method === 'POST') {
        const parts = cleanPath.split('/')
        const messageId = parts[parts.length - 2]
        const body = options.body || {}
        return await applyGmailMessageAction({
          accountId: body.accountId,
          messageId,
          action: body.action
        })
      }

      // 7. POST /api/gmail/send
      if (cleanPath === '/api/gmail/send' && method === 'POST') {
        const body = options.body || {}
        const cleanRecipients = (val: any) => {
          const items = Array.isArray(val) ? val : [val]
          return items.map((item: any) => String(item).trim()).filter(Boolean)
        }
        const payload = {
          to: cleanRecipients(body.to),
          cc: body.cc ? cleanRecipients(body.cc) : undefined,
          bcc: body.bcc ? cleanRecipients(body.bcc) : undefined,
          subject: body.subject,
          bodyText: body.bodyText ? body.bodyText + '\n\n--\nSent via bubbles.mail' : undefined,
          bodyHtml: body.bodyHtml ? body.bodyHtml + '<br><br>--<br><i>Sent via bubbles.mail</i>' : undefined,
          threadId: body.threadId,
          inReplyTo: body.inReplyTo,
          references: body.references,
          attachments: body.attachments
        }
        return await sendGmailMessage(body.accountId, payload)
      }

      // 8. POST /api/gmail/sync
      if (cleanPath === '/api/gmail/sync' && method === 'POST') {
        const body = options.body || {}
        return await syncGmailMessages({
          accountId: body.accountId,
          label: body.label,
          q: body.q,
          maxResults: body.maxResults ? Number(body.maxResults) : undefined,
          pageToken: body.pageToken
        })
      }

      // 9. GET /api/gmail/drafts
      if (cleanPath === '/api/gmail/drafts' && method === 'GET') {
        const q = options.query || {}
        const accountEmail = q.accountEmail
        if (!accountEmail) throw new Error('accountEmail query param required')

        const sqlite = getSqliteConnection()
        const stmt = sqlite.prepare('SELECT * FROM gmail_drafts WHERE account_email = ? ORDER BY updated_at DESC')
        const rows = stmt.all(accountEmail) as any[]

        return rows.map(row => ({
          id: row.id,
          subject: row.subject,
          body: row.body,
          toChips: JSON.parse(row.to_json),
          ccChips: JSON.parse(row.cc_json),
          bccChips: JSON.parse(row.bcc_json),
          time: new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
      }

      // 10. POST /api/gmail/drafts
      if (cleanPath === '/api/gmail/drafts' && method === 'POST') {
        const body = options.body || {}
        const sqlite = getSqliteConnection()
        const stmt = sqlite.prepare(`
          INSERT INTO gmail_drafts (id, account_email, subject, body, to_json, cc_json, bcc_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            subject = excluded.subject,
            body = excluded.body,
            to_json = excluded.to_json,
            cc_json = excluded.cc_json,
            bcc_json = excluded.bcc_json,
            updated_at = excluded.updated_at
        `)
        stmt.run(
          body.id,
          body.accountEmail,
          body.subject,
          body.body,
          JSON.stringify(body.toChips || []),
          JSON.stringify(body.ccChips || []),
          JSON.stringify(body.bccChips || []),
          Date.now()
        )
        return { success: true }
      }

      // 11. DELETE /api/gmail/drafts/[id]
      if (cleanPath.startsWith('/api/gmail/drafts/') && method === 'DELETE') {
        const parts = cleanPath.split('/')
        const draftId = parts[parts.length - 1]
        const sqlite = getSqliteConnection()
        const stmt = sqlite.prepare('DELETE FROM gmail_drafts WHERE id = ?')
        stmt.run(draftId)
        return { success: true }
      }

      throw new Error(`Route not found: ${method} ${path}`)
    } catch (err: any) {
      console.error(`[Electron IPC Error] Route failed for ${path}:`, err)
      throw new Error(err.message || 'Internal main process error')
    }
  })

  // AI Stream tracking for AbortController
  const activeStreams = new Map<string, AbortController>()

  ipcMain.on('api-stream-start', async (event, { streamId, path, options }) => {
    const controller = new AbortController()
    activeStreams.set(streamId, controller)

    try {
      let result;
      const modelName = options.headers?.['x-ai-model'] || options.body?.model
      if (!modelName) {
        throw new Error('No AI model selected. Please select a model in Settings > AI.')
      }
      const parsedBody = options.body || {}

      if (path === '/api/ai/draft') {
        result = await streamText({
          model: ollama(modelName, { think: true }),
          system: 'You are an expert email drafting assistant. Draft professional, concise, and highly effective emails. Output the email subject on the first line prefixed with "Subject:", then a blank line, then the email body. Do not output any other conversational filler.',
          prompt: parsedBody.prompt,
          abortSignal: controller.signal,
          providerOptions: { ollama: { think: true } }
        })
      } else if (path === '/api/ai/reply') {
        console.log(`[Stream IPC] Starting reply generation for ${modelName}...`)
        result = await streamText({
          model: ollama(modelName, { think: true }),
          system: parsedBody.system || 'You are an expert email drafting assistant. You are replying to the provided email thread context. Draft a concise and professional reply. ONLY output the email body. No subject line needed.',
          prompt: `Context:\n${parsedBody.context}\n\nInstructions:\n${parsedBody.prompt}`,
          abortSignal: controller.signal,
          providerOptions: { ollama: { think: true } }
        })
      } else if (path === '/api/ai/chat') {
        console.log(`[Stream IPC] Starting chat generation for ${modelName}...`)
        const fullPrompt = parsedBody.history
          ? `${parsedBody.history}\n\nUser: ${parsedBody.prompt}`
          : parsedBody.prompt
          
        if (parsedBody.images && parsedBody.images.length > 0) {
          const content: any[] = [{ type: 'text', text: fullPrompt }]
          for (const imgUrl of parsedBody.images) {
            content.push({ type: 'image', image: new URL(imgUrl) })
          }
          result = await streamText({
            model: ollama(modelName, { think: true }),
            system: parsedBody.system || 'You are Bubbles AI, a helpful email assistant. Be concise, professional, and helpful.',
            messages: [{ role: 'user', content }],
            abortSignal: controller.signal,
            providerOptions: { ollama: { think: true } }
          })
        } else {
          result = await streamText({
            model: ollama(modelName, { think: true }),
            system: parsedBody.system || 'You are Bubbles AI, a helpful email assistant. Be concise, professional, and helpful.',
            prompt: fullPrompt,
            abortSignal: controller.signal,
            providerOptions: { ollama: { think: true } }
          })
        }
      } else {
        throw new Error('Unknown streaming path')
      }

      console.log(`[Stream IPC] Stream started, waiting for fullStream parts...`)
      for await (const part of result.fullStream) {
        if (controller.signal.aborted) {
          console.log(`[Stream IPC] Stream aborted by client.`)
          break
        }
        
        // DEBUG: Log the chunk type
        console.log(`[Stream IPC] Received chunk type: ${part.type}`)
        
        if (part.type === 'reasoning-delta') {
          event.sender.send(`stream-chunk-${streamId}`, { type: 'reasoning', text: part.textDelta || part.text })
        } else if (part.type === 'text-delta') {
          event.sender.send(`stream-chunk-${streamId}`, { type: 'text', text: part.textDelta || part.text })
        }
      }

      if (!controller.signal.aborted) {
        console.log(`[Stream IPC] Stream finished naturally.`)
        event.sender.send(`stream-finish-${streamId}`)
      }
    } catch (err: any) {
      console.error(`[Stream IPC] Error caught:`, err.message)
      if (err.name !== 'AbortError') {
        event.sender.send(`stream-error-${streamId}`, err.message)
      }
    } finally {
      activeStreams.delete(streamId)
    }
  })

  ipcMain.on('api-stream-abort', (_event, streamId) => {
    if (activeStreams.has(streamId)) {
      activeStreams.get(streamId)?.abort()
      activeStreams.delete(streamId)
    }
  })

  // Common browser external url opening
  ipcMain.handle('open-external', async (_, url) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('get-app-version', async () => {
    return app.getVersion()
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
