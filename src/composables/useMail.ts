import { ref, computed } from 'vue'
import { useDailyDigest } from './useDailyDigest'

export interface Email {
  id: string
  sender: string
  senderEmail: string
  subject: string
  date: string
  body: string
  tags: string[]
  category: 'social' | 'updates' | 'forums' | 'shopping' | 'promotions' | 'primary'
  unread: boolean
  account: string // target account email
  dateKey: string // timeline context: 'Today' | 'Yesterday' | 'Thu, Apr 23' etc.
}

// Initial state mock data mapped to specific accounts and timeline dates
const mockEmails: Email[] = [
  {
    id: '1',
    sender: 'William Smith',
    senderEmail: 'william.smith@example.com',
    subject: 'Meeting Tomorrow',
    date: 'Today, 10:00 AM',
    body: `Hi, let's have a meeting tomorrow to discuss the project. I've been reviewing the project details and have some ideas I'd like to share. It's crucial that we align on our timeline, resource allocation, and core deliverables before the quarterly presentation.

I have compiled a brief presentation deck outlining:
1. Current milestone progression and completed sprints.
2. Resource bottlenecks and proposed hires.
3. Client feedback on the design iterations.

Let's meet at 10:00 AM in Conference Room B or via the Google Meet link attached to the invite. Please bring your feedback on the API designs.

Best regards,
William Smith
VP of Engineering, Bubbles.mail`,
    tags: ['meeting', 'work', 'important'],
    category: 'primary',
    unread: false,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Today'
  },
  {
    id: '2',
    sender: 'Alice Smith',
    senderEmail: 'alice.smith@example.com',
    subject: 'Re: Project Update',
    date: 'Tue, Apr 21, 4:30 PM',
    body: `Thank you for the project update. It looks great! I've gone through the report, and the progress is impressive. The team has done a fantastic job, and I'm very confident we will hit our Q2 launch target.

I especially appreciated the breakdown of the AI-driven smart categorization pipeline. The user flows feel intuitive, and the latency reduction looks very promising. 

A few minor suggestions:
- Can we add a fallback categorizer for when the LLM service is offline?
- We should ensure all user preferences are cached locally in SQLite (via Tauri).

Let's discuss these during our sync next Tuesday. Keep up the amazing work!

Best,
Alice Smith
Product Lead`,
    tags: ['work', 'important'],
    category: 'primary',
    unread: false,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Tue, Apr 21'
  },
  {
    id: '3',
    sender: 'Bob Johnson',
    senderEmail: 'bob.johnson@example.com',
    subject: 'Weekend Plans',
    date: 'Yesterday, 9:15 AM',
    body: `Any plans for the weekend? I was thinking of going hiking in the nearby mountains. It's been a while since we had some outdoor fun. If you're free, we could head out early Saturday morning to catch the sunrise at the peak.

The weather forecast is looking perfect—clear skies and cool temperatures. Let me know if you're interested and if you'd like to invite anyone else. I can drive!

Cheers,
Bob`,
    tags: ['personal'],
    category: 'primary',
    unread: false,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Yesterday'
  },
  {
    id: '4',
    sender: 'Emily Davis',
    senderEmail: 'emily.davis@example.com',
    subject: 'Re: Question about Budget',
    date: 'Today, 11:15 AM',
    body: `I have a question about the budget for the upcoming project. It seems like there's a discrepancy in the allocation of resources. I've reviewed the budget sheets and noticed that the QA team allocation is about 15% lower than initially proposed, while the dev infrastructure allocation has increased.

Could you clarify if this shift was deliberate, or if we need to adjust the figures? Ensuring our QA team is fully funded is vital to preventing post-launch regressions in the desktop app client.

I've attached the revised spreadsheet. Let's schedule 10 minutes to walk through it.

Thanks,
Emily Davis
Head of QA`,
    tags: ['work', 'budget'],
    category: 'updates',
    unread: true,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Today'
  },
  {
    id: '5',
    sender: 'Michael Wilson',
    senderEmail: 'michael.wilson@example.com',
    subject: 'Important Announcement',
    date: 'Today, 2:00 PM',
    body: `I have an important announcement to make during our team meeting today. We have officially secured our Series A funding round! This is a massive milestone for Bubbles.mail and is a testament to the incredibly hard work each of you has put in.

With this funding, we will be expanding the engineering and product team, accelerating our AI Daily Digest features, and moving into our new downtown office space next month.

Please join our all-hands call at 2:00 PM for the full details, a breakdown of the new stock option pool, and a celebratory Q&A session.

Incredible job, team!
Michael Wilson
Co-Founder & CEO`,
    tags: ['work', 'important'],
    category: 'updates',
    unread: true,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Today'
  },
  {
    id: '6',
    sender: 'Dribbble Weekly',
    senderEmail: 'digest@dribbble.com',
    subject: 'Inspiration: Sleek Mail Clients and AI Dashboards',
    date: 'Wed, Apr 22, 11:30 AM',
    body: `Here is your weekly dose of design inspiration from Dribbble! This week, we've curated the most popular UI/UX concepts for next-generation email applications, intelligent workspaces, and AI summarization feeds.

Trending Shots:
- "Bubbles.mail - Daily AI Feed UI" by CreativeNinja
- "Email Client Dark Mode HUD" by PixelCraft
- "Contextual Action Sidebar" by UIStar

Tap into these visual references to elevate your current front-end design iterations.

Keep designing!
The Dribbble Team`,
    tags: ['inspiration', 'social'],
    category: 'social',
    unread: false,
    account: 'thenormvg@gmail.com',
    dateKey: 'Wed, Apr 22'
  },
  {
    id: '7',
    sender: 'GitHub',
    senderEmail: 'noreply@github.com',
    subject: '[GitHub] Security Alert: dependency update required',
    date: 'Today, 8:30 AM',
    body: `We found a known vulnerability in one of your dependencies. A package in bubbles-mail has a moderate severity security warning.

Vulnerability Details:
- Package: dev-bundler-utility
- Severity: Moderate
- Path: package.json -> vite -> dev-bundler-utility
- Remediation: Upgrade to version 8.0.15 or higher.

Please run 'pnpm update' to resolve.

Thanks,
The GitHub Security Team`,
    tags: ['security', 'forums'],
    category: 'forums',
    unread: true,
    account: 'thenormvg@gmail.com',
    dateKey: 'Today'
  },
  {
    id: '8',
    sender: 'Figma Billing',
    senderEmail: 'billing@figma.com',
    subject: 'Your monthly Figma invoice is ready',
    date: 'Yesterday, 3:45 PM',
    body: `Your invoice for Figma Professional subscription has been generated.

Invoice Details:
- Invoice #: FIG-2026-05-891
- Date: May 20, 2026
- Amount Due: $15.00 (Paid via card ending in *4242)

You can download a PDF of your invoice from your Figma Account Settings panel.

Thank you for designing with Figma!
The Figma Team`,
    tags: ['receipt', 'shopping'],
    category: 'shopping',
    unread: false,
    account: 'thealphaones.hq@gmail.com',
    dateKey: 'Yesterday'
  },
  {
    id: '9',
    sender: 'Vercel Teams',
    senderEmail: 'promo@vercel.com',
    subject: 'Deploy your Nuxt app instantly with Vercel Ship',
    date: 'Thu, Apr 23, 10:00 AM',
    body: `Deploying Nuxt applications has never been easier. With Vercel Ship, get lightning-fast edge rendering, global CDN delivery, automatic image optimization, and one-click preview deployments for every Git commit.

Try Vercel Ship today for free and unlock the ultimate developer experience.

Cheers,
Vercel Team`,
    tags: ['promotions', 'advertisement'],
    category: 'promotions',
    unread: true,
    account: 'thealphaones.hq@gmail.com',
    dateKey: 'Thu, Apr 23'
  },
  {
    id: '10',
    sender: 'Michael Wilson',
    senderEmail: 'michael.wilson@example.com',
    subject: 'Weekly Roadmap & Options Pool Expansion',
    date: 'Mon, Apr 20, 9:00 AM',
    body: `Hi team,

As part of our post-Series A weekly roadmap sync, co-founders have finalized the stock options pool parameters. 

We are expanding the stock options pool to ensure we can attract top-tier talent for the upcoming Action Engine core releases and mobile client iterations next month.

Please review these allocations in the options sheet before Tuesday's alignment sync.

Thanks,
Michael Wilson
Co-Founder & CEO`,
    tags: ['work', 'important'],
    category: 'updates',
    unread: false,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Mon, Apr 20'
  },
  {
    id: '11',
    sender: 'Bubbles System',
    senderEmail: 'sysops@bubbles.mail',
    subject: 'Uptime Metrics: Server Health report',
    date: 'Sun, Apr 19, 11:00 PM',
    body: `Automated server system metrics report: 99.98% uptime. 
All background data cleanup jobs and cache purging routines completed successfully without database locks.

Metrics details:
- CPU Load: 12% average
- DB Query latency: 8.5ms average
- Edge prefetch hits: 92%

Everything is running stable.

Bubbles System Ops`,
    tags: ['security'],
    category: 'updates',
    unread: false,
    account: 'vishnuarunkmgupta@gmail.com',
    dateKey: 'Sun, Apr 19'
  }
]

// Shared state references
const emails = ref<Email[]>(mockEmails)
const selectedEmailId = ref<string | null>('1') // default select first email
const searchQuery = ref<string>('')
const activeCategory = ref<string | null>(null)
const activeTab = ref<'all' | 'unread'>('all')
const viewMode = ref<'digest' | 'inbox' | 'chat' | 'settings'>('digest') // 'digest' is default (Bubbles AI)
const activeAccount = ref<string>('vishnuarunkmgupta@gmail.com') // Unified account selector state

export function useMail() {
  const { selectedDateKey } = useDailyDigest()

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

      // New: Filter by active date key context (Today, Yesterday, Thu, Apr 23 etc.)
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
    const counts: Record<string, number> = {
      'vishnuarunkmgupta@gmail.com': 0,
      'thenormvg@gmail.com': 0,
      'thealphaones.hq@gmail.com': 0
    }
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

  const setViewMode = (mode: 'digest' | 'inbox' | 'chat' | 'settings') => {
    viewMode.value = mode
  }

  const setActiveAccount = (accountEmail: string) => {
    activeAccount.value = accountEmail
    // Auto-select first email inside this account context
    const firstFiltered = filteredEmails.value[0]
    selectedEmailId.value = firstFiltered ? firstFiltered.id : null
  }

  const deleteEmail = (id: string) => {
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
    deleteEmail(id)
  }

  const markUnread = (id: string) => {
    const email = emails.value.find(e => e.id === id)
    if (email) {
      email.unread = true
      selectedEmailId.value = null
    }
  }

  return {
    emails,
    selectedEmailId,
    selectedEmail,
    searchQuery,
    activeCategory,
    activeTab,
    viewMode,
    activeAccount,
    filteredEmails,
    totalUnreadCount,
    accountUnreadCounts,
    categoryCounts,
    setSelectedEmailId,
    setSearchQuery,
    setActiveCategory,
    setActiveTab,
    setViewMode,
    setActiveAccount,
    deleteEmail,
    archiveEmail,
    markUnread
  }
}
