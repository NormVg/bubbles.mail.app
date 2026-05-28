import { google } from 'googleapis'
import { createOauthState } from './repository'

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export function getGoogleOAuthConfig() {
  const clientId = process.env.NUXT_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.NUXT_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.NUXT_GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:9944/api/gmail/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials. Set NUXT_GOOGLE_CLIENT_ID and NUXT_GOOGLE_CLIENT_SECRET.')
  }

  return { clientId, clientSecret, redirectUri }
}

export function createOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export async function createGmailAuthUrl(options: { redirectAfter?: string | null } = {}) {
  const oauth2Client = createOAuth2Client()
  const { state, expiresAt } = await createOauthState(options.redirectAfter)
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state,
  })

  return { authUrl, state, expiresAt: expiresAt.getTime() }
}
