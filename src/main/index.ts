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
import { streamText } from 'ai'
import { SarvamAIClient } from 'sarvamai'
import { Readable } from 'stream'

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

      // 1. GET /api/gmail/accounts
      if (cleanPath === '/api/gmail/accounts' && method === 'GET') {
        const result = await listGmailAccounts()
        console.log(`[Electron IPC] Accounts returned: ${result.length} accounts`)
        return result
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
          bodyText: body.bodyText,
          bodyHtml: body.bodyHtml,
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
          model: ollama(modelName),
          system: 'You are an expert email drafting assistant. Draft professional, concise, and highly effective emails. Output the email subject on the first line prefixed with "Subject:", then a blank line, then the email body. Do not output any other conversational filler.',
          prompt: parsedBody.prompt,
          abortSignal: controller.signal
        })
      } else if (path === '/api/ai/reply') {
        result = await streamText({
          model: ollama(modelName),
          system: 'You are an expert email drafting assistant. You are replying to the provided email thread context. Draft a concise and professional reply. ONLY output the email body. No subject line needed.',
          prompt: `Context:\n${parsedBody.context}\n\nInstructions:\n${parsedBody.prompt}`,
          abortSignal: controller.signal
        })
      } else if (path === '/api/ai/chat') {
        const fullPrompt = parsedBody.history 
          ? `${parsedBody.history}\n\nUser: ${parsedBody.prompt}`
          : parsedBody.prompt
        result = await streamText({
          model: ollama(modelName),
          system: parsedBody.system || 'You are Bubbles AI, a helpful email assistant. Be concise, professional, and helpful.',
          prompt: fullPrompt,
          abortSignal: controller.signal
        })
      } else {
        throw new Error('Unknown streaming path')
      }

      for await (const chunk of result.textStream) {
        if (controller.signal.aborted) break
        event.sender.send(`stream-chunk-${streamId}`, chunk)
      }
      
      if (!controller.signal.aborted) {
        event.sender.send(`stream-finish-${streamId}`)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        event.sender.send(`stream-error-${streamId}`, err.message)
      }
    } finally {
      activeStreams.delete(streamId)
    }
  })

  ipcMain.on('api-stream-abort', (event, streamId) => {
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
