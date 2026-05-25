import { ref, computed } from 'vue'

export interface DigestTask {
  id: string
  text: string
  completed: boolean
  sourceEmailId: string
}

export interface DigestDeadline {
  id: string
  text: string
  urgency: 'high' | 'medium' | 'low'
  sourceEmailId: string
}

export interface DigestThread {
  id: string
  who: string
  topic: string
  summary: string
  status: string
  sourceEmailId: string
}

export interface DailyReport {
  dateKey: string // 'Today' | 'Yesterday' | 'Thu, Apr 23' etc.
  dateFormatted: string // e.g. "Monday, May 25, 2026"
  summary: string[]
  tasks: DigestTask[]
  deadlines: DigestDeadline[]
  threads: DigestThread[]
  insights: string[]
}

const mockDailyReports: DailyReport[] = [
  {
    dateKey: 'Today',
    dateFormatted: 'Monday, May 25, 2026',
    summary: [
      'Successfully completed Series A funding round as announced by CEO Michael Wilson. Major expansion planned for engineering and product teams.',
      'VP of Engineering William Smith requested a technical alignment meeting tomorrow at 10:00 AM in Conference Room B regarding API designs.',
      'Head of QA Emily Davis flagged a 15% budget under-allocation issue for the QA team client and shared a revised spreadsheet.',
      'Security alert: GitHub reported a moderate severity vulnerability in your Vite package dependency (`dev-bundler-utility`).'
    ],
    tasks: [
      {
        id: 't1',
        text: 'Prepare feedback on the new API designs for VP of Engineering',
        completed: false,
        sourceEmailId: '1'
      },
      {
        id: 't2',
        text: 'Review QA team budget spreadsheet sent by Emily Davis',
        completed: false,
        sourceEmailId: '4'
      },
      {
        id: 't3',
        text: 'Run pnpm update to upgrade dev-bundler-utility and patch GitHub warning',
        completed: false,
        sourceEmailId: '7'
      },
      {
        id: 't4',
        text: 'Join the all-hands Series A celebration call at 2:00 PM',
        completed: true,
        sourceEmailId: '5'
      }
    ],
    deadlines: [
      {
        id: 'd1',
        text: 'Join Q&A All-Hands call (Today at 2:00 PM)',
        urgency: 'high',
        sourceEmailId: '5'
      },
      {
        id: 'd2',
        text: 'Meeting with William Smith regarding API Timeline (Tomorrow at 10:00 AM)',
        urgency: 'high',
        sourceEmailId: '1'
      },
      {
        id: 'd3',
        text: 'Address dependency vulnerability security patch before production build',
        urgency: 'medium',
        sourceEmailId: '7'
      }
    ],
    threads: [
      {
        id: 'th1',
        who: 'Michael Wilson',
        topic: 'Series A Funding Confirmed',
        summary: 'Secured Series A funding. The company is preparing to scale the engineering team, expand office space, and accelerate AI digest production.',
        status: 'Celebration / Growth Sync',
        sourceEmailId: '5'
      },
      {
        id: 'th2',
        who: 'William Smith',
        topic: 'Q3 Technical Roadmap Alignment',
        summary: 'William compiled a dev deck detailing completed sprints, design iterations, and requested a live review of the upcoming API models tomorrow.',
        status: 'Meeting scheduled',
        sourceEmailId: '1'
      },
      {
        id: 'th3',
        who: 'Emily Davis',
        topic: 'QA Budget Deficit',
        summary: 'QA resource allocation has dropped by 15% in favor of dev infrastructure. Emily has shared a counter-proposal to fund full-coverage desktop tests.',
        status: 'Awaiting response',
        sourceEmailId: '4'
      }
    ],
    insights: [
      'You secured Series A funding today! Celebrate with the team.',
      'You have 2 pending technical follow-ups related to infrastructure and budget.',
      'GitHub reports 1 security vulnerability requiring immediate attention.'
    ]
  },
  {
    dateKey: 'Yesterday',
    dateFormatted: 'Sunday, May 24, 2026',
    summary: [
      'Weekly graphic design inspiration received from Dribbble, highlighting popular sleek email HUD designs.',
      'Bob Johnson proposed a weekend hiking trip Saturday morning to watch the sunrise. Transportation is covered by Bob.',
      'Figma invoice generated and successfully auto-paid for your Professional Team seat subscription ($15.00).'
    ],
    tasks: [
      {
        id: 't5',
        text: 'Respond to Bob Johnson about the weekend hiking plans',
        completed: true,
        sourceEmailId: '3'
      },
      {
        id: 't6',
        text: 'Download monthly Figma invoice PDF for records',
        completed: false,
        sourceEmailId: '8'
      }
    ],
    deadlines: [
      {
        id: 'd4',
        text: 'RSVP to Bob Johnson hiking invite',
        urgency: 'low',
        sourceEmailId: '3'
      }
    ],
    threads: [
      {
        id: 'th4',
        who: 'Bob Johnson',
        topic: 'Outdoor Weekend Trip',
        summary: 'Bob wants to do an early Saturday hike. Clear skies are forecasted. He offered to drive and coordinate the group.',
        status: 'Awaiting confirmation',
        sourceEmailId: '3'
      }
    ],
    insights: [
      'It was a calm Sunday: mainly personal coordination and automated design digests.',
      'Figma subscription successfully renewed for another month.'
    ]
  },
  {
    dateKey: 'Thu, Apr 23',
    dateFormatted: 'Thursday, April 23, 2026',
    summary: [
      'Vercel announced the rollout of their edge caching mechanisms for high-performance client rendering.',
      'Engineering discussed hot-swapping Vue components locally in Tauri desktop views.'
    ],
    tasks: [
      {
        id: 't7',
        text: 'Evaluate Vercel edge deployment options for Nuxt client',
        completed: false,
        sourceEmailId: '9'
      }
    ],
    deadlines: [],
    threads: [
      {
        id: 'th5',
        who: 'Vercel Teams',
        topic: 'Nuxt Hosting Optimization',
        summary: 'Vercel promoted Edge and Serverless rendering. Detailed automatic asset compilation pipelines for fast web apps.',
        status: 'Archived review',
        sourceEmailId: '9'
      }
    ],
    insights: [
      'Edge architecture planning completed for faster page loads.'
    ]
  },
  {
    dateKey: 'Wed, Apr 22',
    dateFormatted: 'Wednesday, April 22, 2026',
    summary: [
      'Completed a security assessment of internal dependencies.',
      'Marketing shared a design brief for the upcoming Bubbles.mail landing page.'
    ],
    tasks: [
      {
        id: 't8',
        text: 'Provide feedback on marketing landing page assets',
        completed: true,
        sourceEmailId: '6'
      }
    ],
    deadlines: [],
    threads: [],
    insights: [
      'All security credentials validated for the repository.'
    ]
  },
  {
    dateKey: 'Tue, Apr 21',
    dateFormatted: 'Tuesday, April 21, 2026',
    summary: [
      'Figma design sync: reviewed low-fidelity email timelines.',
      'Customer support flagged a regression on attachment downloads in older macOS clients.'
    ],
    tasks: [
      {
        id: 't9',
        text: 'Investigate attachment download regression',
        completed: true,
        sourceEmailId: '2'
      }
    ],
    deadlines: [],
    threads: [],
    insights: [
      'Attachment downloads fixed for desktop environments.'
    ]
  },
  {
    dateKey: 'Mon, Apr 20',
    dateFormatted: 'Monday, April 20, 2026',
    summary: [
      'Weekly roadmap planning: finalized priorities for the core Action Engine.',
      'Co-founders discussed expanding stock options pool post Series A.'
    ],
    tasks: [],
    deadlines: [],
    threads: [],
    insights: [
      'Action Engine parameters are successfully frozen for initial launch.'
    ]
  },
  {
    dateKey: 'Sun, Apr 19',
    dateFormatted: 'Sunday, April 19, 2026',
    summary: [
      'Automated server system metrics report: 99.98% uptime.',
      'Routine background cleanups completed successfully.'
    ],
    tasks: [],
    deadlines: [],
    threads: [],
    insights: [
      'Uptime remains stable across all services.'
    ]
  }
]

// Stateful references
const dailyReports = ref<DailyReport[]>(mockDailyReports)
const selectedDateKey = ref<string>('Today')

export function useDailyDigest() {
  const selectedReport = computed(() => {
    return dailyReports.value.find(report => report.dateKey === selectedDateKey.value) || dailyReports.value[0]
  })

  const setSelectedDateKey = (key: string) => {
    selectedDateKey.value = key
  }

  const toggleTask = (taskId: string) => {
    dailyReports.value.forEach(report => {
      const task = report.tasks.find(t => t.id === taskId)
      if (task) {
        task.completed = !task.completed
      }
    })
  }

  const addTask = (text: string, dateKey: string, sourceEmailId: string = '1') => {
    const report = dailyReports.value.find(r => r.dateKey === dateKey)
    if (report) {
      report.tasks.push({
        id: `t_${Date.now()}`,
        text,
        completed: false,
        sourceEmailId
      })
    }
  }

  return {
    dailyReports,
    selectedDateKey,
    selectedReport,
    setSelectedDateKey,
    toggleTask,
    addTask
  }
}
