import { ref, computed, watch } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import { useDailyDigest } from './useDailyDigest'
import { appApiFetch } from './useAppApi'

type EmailCategory = 'social' | 'updates' | 'forums' | 'shopping' | 'promotions' | 'primary'

export interface Email {
  id: string
  sender: string
  senderEmail: string
  subject: string
  date: string
  body: string
  tags: string[]
  category: EmailCategory
  unread: boolean
  account: string // target account email
  dateKey: string
  source: 'gmail'
  gmailAccountId?: string
  gmailMessageId?: string
  bodyHtml?: string | null
  timestamp?: number | null
}

export interface GmailAccount {
  id: string
  email: string
  googleUserId: string | null
  displayName: string | null
  avatarUrl: string | null
  scope: string | null
  expiryDate: number | null
  historyId: string | null
  lastSyncAt: number | null
  connectedAt: number
  updatedAt: number
}

interface GmailApiMessage {
  id: string
  accountId: string
  gmailMessageId: string
  threadId: string
  subject: string
  snippet: string
  sender: string
  senderEmail: string
  timestamp: number | null
  unread: boolean
  starred: boolean
  labels: string[]
  bodyText: string | null
  bodyHtml: string | null
}

export const useMailStore = defineStore('mail', () => {
  const emails = ref<Email[]>([])
  const selectedEmailId = ref<string | null>(null)
  const searchQuery = ref<string>('')
  const activeCategory = ref<string | null>(null)
  const activeTab = ref<'all' | 'unread'>('all')
  const viewMode = ref<'digest' | 'inbox' | 'chat' | 'settings' | 'compose'>('digest')
  const activeAccount = ref<string>('')
  const gmailAccounts = ref<GmailAccount[]>([])
  const gmailLoading = ref(false)
  const gmailSyncing = ref(false)
  const gmailConnectPending = ref(false)
  const gmailError = ref<string | null>(null)
  const gmailHasMore = ref(true)
  const gmailPageLoading = ref(false)
  const { selectedDateKey } = useDailyDigest()

  const aiSummaryCache = ref<Record<string, any>>({})

  // Load cache from localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedCache = window.localStorage.getItem('bubbles_ai_summary_cache')
      if (storedCache) {
        aiSummaryCache.value = JSON.parse(storedCache)
      }
    } catch (e) {
      console.error('Failed to load AI summary cache:', e)
    }
  }

  // Auto-save cache to localStorage
  watch(aiSummaryCache, (newCache) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('bubbles_ai_summary_cache', JSON.stringify(newCache))
      } catch (e) {
        console.error('Failed to save AI summary cache:', e)
      }
    }
  }, { deep: true })

  const gmailAccountEmails = computed(() => gmailAccounts.value.map(account => account.email))
  const visibleAccounts = computed(() => gmailAccountEmails.value)
  const timelineDateKeys = computed(() => {
    const buckets = new Map<string, { dateKey: string; count: number; sort: number; label: string }>()

    emails.value
      .filter(email => !activeAccount.value || email.account === activeAccount.value)
      .forEach(email => {
        const current = buckets.get(email.dateKey)
        const sort = email.timestamp || 0

        if (current) {
          current.count += 1
          current.sort = Math.max(current.sort, sort)
        } else {
          buckets.set(email.dateKey, { dateKey: email.dateKey, count: 1, sort, label: '' })
        }
      })

    const recentDates = getRecentTimelineDates(7)
    const recentEntries = recentDates.map(item => {
      const bucket = buckets.get(item.dateKey)
      return {
        dateKey: item.dateKey,
        label: item.label,
        count: bucket?.count || 0,
        sort: bucket?.sort || item.sort,
      }
    })
    return recentEntries
  })

  const selectedEmail = computed(() => 
    emails.value.find(email => email.id === selectedEmailId.value) || null
  )

  // Filtered emails based on active account, active date, search query, categories, and tabs
  const filteredEmails = computed(() => {
    return emails.value.filter(email => {
      // 0. Filter by active account context
      if (activeAccount.value && email.account !== activeAccount.value) {
        return false
      }

      // Filter by active date key context
      if (selectedDateKey.value && email.dateKey !== selectedDateKey.value) {
        return false
      }

      // 1. Filter by category (if active)
      if (activeCategory.value) {
        if (email.category !== activeCategory.value && email.tags.indexOf(activeCategory.value) === -1) {
          return false
        }
      }
      
      // 2. Filter by All / Unread
      if (activeTab.value === 'unread' && !email.unread) {
        return false
      }
      
      // 3. Filter by Search Query
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim()
        const matchSender = email.sender.toLowerCase().includes(query)
        const matchSubject = email.subject.toLowerCase().includes(query)
        const matchBody = email.body.toLowerCase().includes(query)
        const matchTags = email.tags.some(tag => tag.toLowerCase().includes(query))
        return matchSender || matchSubject || matchBody || matchTags
      }
      
      return true
    })
  })

  // Get unread count specifically for active account or overall
  const totalUnreadCount = computed(() => {
    return emails.value.filter(email => email.unread).length
  })

  // Get account specific unread counts
  const accountUnreadCounts = computed(() => {
    const counts: Record<string, number> = {}
    visibleAccounts.value.forEach(account => {
      counts[account] = 0
    })
    emails.value.forEach(email => {
      if (email.unread && email.account in counts) {
        counts[email.account]++
      }
    })
    return counts
  })

  const categoryCounts = computed(() => {
    const counts = {
      social: 0,
      updates: 0,
      forums: 0,
      shopping: 0,
      promotions: 0
    }
    emails.value.forEach(email => {
      if (email.category in counts) {
        counts[email.category as keyof typeof counts]++
      }
    })
    return counts
  })

  // Setters & Actions
  const setSelectedEmailId = (id: string | null) => {
    selectedEmailId.value = id
    // Mark as read when selected
    if (id) {
      const email = emails.value.find(e => e.id === id)
      if (email && email.unread) {
        email.unread = false
        void applyGmailAction(email, 'markRead')
      }
    }
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const setActiveCategory = (category: string | null) => {
    activeCategory.value = category
    const firstFiltered = filteredEmails.value[0]
    selectedEmailId.value = firstFiltered ? firstFiltered.id : null
  }

  const setActiveTab = (tab: 'all' | 'unread') => {
    activeTab.value = tab
    const firstFiltered = filteredEmails.value[0]
    selectedEmailId.value = firstFiltered ? firstFiltered.id : null
  }

  const setViewMode = (mode: 'digest' | 'inbox' | 'chat' | 'settings' | 'compose') => {
    viewMode.value = mode
  }

  const setActiveAccount = (accountEmail: string) => {
    activeAccount.value = accountEmail
    // Automatically clear any active timeline date filter when switching accounts
    selectedDateKey.value = ''
    void loadGmailMessages(accountEmail)
    // Auto-select first email inside this account context
    const firstFiltered = filteredEmails.value[0]
    selectedEmailId.value = firstFiltered ? firstFiltered.id : null
  }

  const sendEmailReply = async (payload: { accountId: string; to: string[]; subject: string; bodyText: string; inReplyTo?: string }) => {
    await appApiFetch('/api/gmail/send', {
      method: 'POST',
      body: payload
    })
  }

  const deleteEmail = (id: string) => {
    const email = emails.value.find(e => e.id === id)
    if (email) void applyGmailAction(email, 'trash')

    const index = emails.value.findIndex(e => e.id === id)
    if (index !== -1) {
      emails.value.splice(index, 1)
      if (selectedEmailId.value === id) {
        const nextFiltered = filteredEmails.value[0]
        selectedEmailId.value = nextFiltered ? nextFiltered.id : null
      }
    }
  }

  const archiveEmail = (id: string) => {
    const email = emails.value.find(e => e.id === id)
    if (email) void applyGmailAction(email, 'archive')

    const index = emails.value.findIndex(e => e.id === id)
    if (index !== -1) {
      emails.value.splice(index, 1)
      if (selectedEmailId.value === id) {
        const nextFiltered = filteredEmails.value[0]
        selectedEmailId.value = nextFiltered ? nextFiltered.id : null
      }
    }
  }

  const markUnread = (id: string) => {
    const email = emails.value.find(e => e.id === id)
    if (email) {
      email.unread = true
      void applyGmailAction(email, 'markUnread')
      selectedEmailId.value = null
    }
  }

  async function refreshGmailAccounts() {
    console.log('[Vue useMail] refreshGmailAccounts starting...')
    gmailLoading.value = true
    gmailError.value = null

    try {
      const accounts = await appApiFetch<GmailAccount[]>('/api/gmail/accounts')
      console.log('[Vue useMail] refreshGmailAccounts retrieved accounts:', accounts.length)
      gmailAccounts.value = accounts

      if (!accounts.length) {
        console.log('[Vue useMail] refreshGmailAccounts: No accounts found.')
        activeAccount.value = ''
        emails.value = []
        selectedEmailId.value = null
        return
      }

      if (accounts.length && !accounts.some((account: GmailAccount) => account.email === activeAccount.value)) {
        activeAccount.value = accounts[0].email
        console.log('[Vue useMail] refreshGmailAccounts: set activeAccount to:', activeAccount.value)
      }

      if (accounts.length) {
        console.log('[Vue useMail] refreshGmailAccounts: calling loadGmailMessages for:', activeAccount.value)
        await loadGmailMessages(activeAccount.value)
        
        // Automatically sync latest 7 days of emails from Gmail API in the background on startup
        void syncActiveGmailAccount()
      }
    } catch (error: any) {
      console.error('[Vue useMail] refreshGmailAccounts error:', error.message || error)
      gmailError.value = getErrorMessage(error)
    } finally {
      gmailLoading.value = false
      console.log('[Vue useMail] refreshGmailAccounts finished. gmailLoading is now:', gmailLoading.value)
    }
  }

  async function connectGmailAccount() {
    gmailLoading.value = true
    gmailConnectPending.value = false
    gmailError.value = null

    try {
      const { authUrl } = await appApiFetch<{ authUrl: string }>('/api/gmail/connect')

      gmailConnectPending.value = true
      await openExternalAuthUrl(authUrl)
    } catch (error) {
      gmailError.value = getErrorMessage(error)
    } finally {
      gmailLoading.value = false
    }
  }

  async function disconnectGmailAccount(accountId: string) {
    gmailLoading.value = true
    gmailError.value = null

    try {
      await appApiFetch(`/api/gmail/accounts/${accountId}`, { method: 'DELETE' })
      await refreshGmailAccounts()
    } catch (error) {
      gmailError.value = getErrorMessage(error)
    } finally {
      gmailLoading.value = false
    }
  }

  async function syncActiveGmailAccount() {
    const account = getActiveGmailAccount()

    if (!account) {
      await connectGmailAccount()
      return
    }

    gmailSyncing.value = true
    gmailError.value = null

    try {
      await appApiFetch('/api/gmail/sync', {
        method: 'POST',
        body: {
          accountId: account.id,
          label: 'INBOX',
          q: 'newer_than:7d', // Google search query: Newer than 7 days from today
          maxResults: 100
        }
      })
      await loadGmailMessages(account.email)
      gmailConnectPending.value = false
    } catch (error) {
      gmailError.value = getErrorMessage(error)
    } finally {
      gmailSyncing.value = false
    }
  }

  async function loadGmailMessages(accountEmail = activeAccount.value) {
    console.log('[Vue useMail] loadGmailMessages starting for email:', accountEmail)
    const account = gmailAccounts.value.find(item => item.email === accountEmail)
    if (!account) {
      console.warn('[Vue useMail] loadGmailMessages: account not found for email:', accountEmail)
      return
    }

    try {
      const messages = await appApiFetch<GmailApiMessage[]>('/api/gmail/messages', {
        query: {
          accountId: account.id,
          limit: 100 // Load up to 100 locally cached messages
        }
      })
      console.log('[Vue useMail] loadGmailMessages retrieved messages:', messages.length)
      const mapped = messages.map((message: GmailApiMessage) => mapGmailMessage(message))

      const mappedMap = new Map(mapped.map(m => [m.id, m]))
      for (let i = 0; i < emails.value.length; i++) {
        const id = emails.value[i].id
        if (emails.value[i].gmailAccountId === account.id && mappedMap.has(id)) {
          emails.value[i] = mappedMap.get(id)!
          mappedMap.delete(id)
        }
      }
      emails.value.unshift(...Array.from(mappedMap.values()))
      emails.value.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      console.log('[Vue useMail] loadGmailMessages: emails array updated. Size:', emails.value.length)

      gmailHasMore.value = true
      gmailPageLoading.value = false

      const firstFiltered = filteredEmails.value[0]
      selectedEmailId.value = firstFiltered ? firstFiltered.id : null
    } catch (error: any) {
      console.error('[Vue useMail] loadGmailMessages error:', error.message || error)
      gmailError.value = getErrorMessage(error)
    }
  }

  async function loadMoreGmailMessages() {
    if (gmailPageLoading.value || !gmailHasMore.value || !activeAccount.value) return

    console.log('[Vue useMail] loadMoreGmailMessages starting...')
    const account = gmailAccounts.value.find(item => item.email === activeAccount.value)
    if (!account) return

    const accountMessages = emails.value.filter(email => email.gmailAccountId === account.id)
    if (accountMessages.length === 0) return

    // Find oldest message in current list
    const oldestMessage = accountMessages.reduce((oldest, current) => {
      if (!oldest.timestamp) return current
      if (!current.timestamp) return oldest
      return current.timestamp < oldest.timestamp ? current : oldest
    }, accountMessages[0])

    if (!oldestMessage.timestamp) return

    gmailPageLoading.value = true
    try {
      // 1. Try to load older cached messages from the local database first
      let nextMessages = await appApiFetch<GmailApiMessage[]>('/api/gmail/messages', {
        query: {
          accountId: account.id,
          limit: 30,
          before: oldestMessage.timestamp
        }
      })

      console.log('[Vue useMail] loadMoreGmailMessages retrieved local next page messages:', nextMessages.length)

      // 2. If no older messages exist locally, fetch them from the Gmail API!
      if (nextMessages.length === 0) {
        const date = new Date(oldestMessage.timestamp)
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const beforeQuery = `before:${yyyy}/${mm}/${dd}`

        console.log('[Vue useMail] loadMoreGmailMessages fetching older messages from Gmail API with query:', beforeQuery)
        
        await appApiFetch('/api/gmail/sync', {
          method: 'POST',
          body: {
            accountId: account.id,
            label: 'INBOX',
            q: beforeQuery,
            maxResults: 30
          }
        })

        // Re-query the database for the newly synced messages
        nextMessages = await appApiFetch<GmailApiMessage[]>('/api/gmail/messages', {
          query: {
            accountId: account.id,
            limit: 30,
            before: oldestMessage.timestamp
          }
        })
        console.log('[Vue useMail] loadMoreGmailMessages after sync retrieved messages:', nextMessages.length)
      }

      if (nextMessages.length === 0) {
        gmailHasMore.value = false
        return
      }

      const mapped = nextMessages.map((message: GmailApiMessage) => mapGmailMessage(message))
      
      const existingIds = new Set(emails.value.map(e => e.id))
      const uniqueNew = mapped.filter(e => !existingIds.has(e.id))

      if (uniqueNew.length === 0) {
        gmailHasMore.value = false
        return
      }

      emails.value.push(...uniqueNew)
      
      // Sort desc by timestamp
      emails.value.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

      if (nextMessages.length < 30) {
        gmailHasMore.value = false
      }
    } catch (error) {
      console.error('[Vue useMail] loadMoreGmailMessages error:', error)
    } finally {
      gmailPageLoading.value = false
    }
  }

  function getActiveGmailAccount() {
    return gmailAccounts.value.find(account => account.email === activeAccount.value) || gmailAccounts.value[0] || null
  }

  async function applyGmailAction(email: Email, action: 'archive' | 'trash' | 'markRead' | 'markUnread') {
    if (email.source !== 'gmail' || !email.gmailAccountId || !email.gmailMessageId) return

    try {
      await appApiFetch(`/api/gmail/messages/${encodeURIComponent(email.gmailMessageId)}/action`, {
        method: 'POST',
        body: {
          accountId: email.gmailAccountId,
          action
        }
      })
    } catch (error) {
      gmailError.value = getErrorMessage(error)
    }
  }

  function mapGmailMessage(message: GmailApiMessage): Email {
    const accountEmail = gmailAccounts.value.find(account => account.id === message.accountId)?.email || activeAccount.value
    const labels = message.labels || []
    const category = getCategoryFromLabels(labels)
    const tags = getTagsFromLabels(labels, message)

    return {
      id: message.id,
      sender: message.sender || message.senderEmail || 'Unknown sender',
      senderEmail: message.senderEmail || '',
      subject: message.subject || '(no subject)',
      date: formatEmailDate(message.timestamp),
      body: getReadableBody(message),
      tags,
      category,
      unread: message.unread,
      account: accountEmail,
      dateKey: getDateKey(message.timestamp),
      source: 'gmail',
      gmailAccountId: message.accountId,
      gmailMessageId: message.gmailMessageId,
      bodyHtml: sanitizeEmailHtml(message.bodyHtml),
      timestamp: message.timestamp
    }
  }

  function getCategoryFromLabels(labels: string[]): EmailCategory {
    if (labels.includes('CATEGORY_PROMOTIONS')) return 'promotions'
    if (labels.includes('CATEGORY_SOCIAL')) return 'social'
    if (labels.includes('CATEGORY_FORUMS')) return 'forums'
    if (labels.includes('CATEGORY_UPDATES')) return 'updates'
    return 'primary'
  }

  function getTagsFromLabels(labels: string[], message: GmailApiMessage) {
    const tags = labels
      .filter(label => label.startsWith('CATEGORY_'))
      .map(label => label.replace('CATEGORY_', '').toLowerCase())

    if (message.starred) tags.push('starred')
    if (message.unread) tags.push('unread')
    return tags.length ? tags : ['inbox']
  }

  function formatEmailDate(timestamp: number | null) {
    if (!timestamp) return ''
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(timestamp))
  }

  function getDateKey(timestamp: number | null) {
    const d = timestamp ? new Date(timestamp) : new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function getRecentTimelineDates(days: number) {
    const today = startOfDay(new Date())

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - index)
      const d = date
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return {
        dateKey,
        label: formatTimelineDate(date),
        sort: date.getTime()
      }
    })
  }

  function startOfDay(date: Date) {
    const nextDate = new Date(date)
    nextDate.setHours(0, 0, 0, 0)
    return nextDate
  }

  function formatTimelineDate(date: Date) {
    const day = startOfDay(date)
    const today = startOfDay(new Date())
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (day.getTime() === today.getTime()) return 'Today'
    if (day.getTime() === yesterday.getTime()) return 'Yesterday'

    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(day)
  }

  function stripHtml(value: string) {
    if (!value) return ''
    return value
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function getReadableBody(message: GmailApiMessage) {
    if (message.bodyText && !looksLikeHtml(message.bodyText)) {
      return message.bodyText
    }

    return stripHtml(message.bodyHtml || message.bodyText || '') || message.snippet || ''
  }

  function looksLikeHtml(value: string) {
    return /<[a-z/][^>]*>/i.test(value) || /body\s*\{|\.email-container\s*\{/i.test(value)
  }

  function sanitizeEmailHtml(value: string | null) {
    if (!value) return null

    const bodyMatch = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const html = bodyMatch?.[1] || value

    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<link[\s\S]*?>/gi, '')
      .replace(/<meta[\s\S]*?>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .trim()
  }

  function getErrorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'data' in error) {
      const data = (error as { data?: { message?: string } }).data
      if (data?.message) return data.message
    }

    return error instanceof Error ? error.message : 'Gmail request failed.'
  }

  async function openExternalAuthUrl(authUrl: string) {
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(authUrl)
      return
    }

    window.location.assign(authUrl)
  }

  return {
    emails, selectedEmailId, selectedEmail, searchQuery, activeCategory,
    activeTab, viewMode, activeAccount, filteredEmails, totalUnreadCount,
    accountUnreadCounts, categoryCounts, gmailAccounts, gmailAccountEmails,
    timelineDateKeys,
    visibleAccounts, gmailLoading, gmailSyncing, gmailConnectPending, gmailError,
    gmailHasMore, gmailPageLoading, aiSummaryCache,
    setSelectedEmailId, setSearchQuery, setActiveCategory, setActiveTab,
    setViewMode, setActiveAccount, deleteEmail, archiveEmail, markUnread,
    sendEmailReply,
    refreshGmailAccounts, connectGmailAccount, disconnectGmailAccount, syncActiveGmailAccount, loadGmailMessages,
    loadMoreGmailMessages
  }
})

export function useMail() {
  const store = useMailStore()
  const {
    emails, selectedEmailId, selectedEmail, searchQuery, activeCategory,
    activeTab, viewMode, activeAccount, filteredEmails, totalUnreadCount,
    accountUnreadCounts, categoryCounts, gmailAccounts, gmailAccountEmails,
    timelineDateKeys,
    visibleAccounts, gmailLoading, gmailSyncing, gmailConnectPending, gmailError,
    gmailHasMore, gmailPageLoading, aiSummaryCache
  } = storeToRefs(store)
  
  return {
    emails, selectedEmailId, selectedEmail, searchQuery, activeCategory,
    activeTab, viewMode, activeAccount, filteredEmails, totalUnreadCount,
    accountUnreadCounts, categoryCounts, gmailAccounts, gmailAccountEmails,
    timelineDateKeys,
    visibleAccounts, gmailLoading, gmailSyncing, gmailConnectPending, gmailError,
    gmailHasMore, gmailPageLoading, aiSummaryCache,
    setSelectedEmailId: store.setSelectedEmailId,
    setSearchQuery: store.setSearchQuery,
    setActiveCategory: store.setActiveCategory,
    setActiveTab: store.setActiveTab,
    setViewMode: store.setViewMode,
    setActiveAccount: store.setActiveAccount,
    deleteEmail: store.deleteEmail,
    sendEmailReply: store.sendEmailReply,
    archiveEmail: store.archiveEmail,
    markUnread: store.markUnread,
    refreshGmailAccounts: store.refreshGmailAccounts,
    connectGmailAccount: store.connectGmailAccount,
    disconnectGmailAccount: store.disconnectGmailAccount,
    syncActiveGmailAccount: store.syncActiveGmailAccount,
    loadGmailMessages: store.loadGmailMessages,
    loadMoreGmailMessages: store.loadMoreGmailMessages
  }
}
