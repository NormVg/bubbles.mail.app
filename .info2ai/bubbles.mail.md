Here’s a **high-detail product + system prompt** you can use to guide yourself (or an AI builder) through building *Bubbles*.
It focuses on **what to build, how it behaves, and what to use**—not code.

---

# 🧠 MASTER PRODUCT PROMPT — “Bubbles”

## 1. Core Vision

Build a web application called **Bubbles** that transforms email from a message-reading experience into a **daily intelligence and action system**.

The product should not resemble a traditional inbox.
Instead of listing emails, it should:

* Aggregate emails by **day**
* Use AI to **understand, extract, and compress information**
* Present a **structured daily report**
* Help the user **act**, not read

---

## 2. Product Philosophy

Bubbles is based on 3 principles:

### 1. Time-centric, not thread-centric

Users think in **days**, not email threads.

→ All data is grouped by date
→ Each day becomes a “unit of understanding”

---

### 2. Intelligence over raw data

Users should never need to scan emails manually.

→ AI extracts:

* tasks
* deadlines
* commitments
* important updates

---

### 3. Action-first interface

The output is not information—it is **what to do next**

---

## 3. Core Experience Flow

### Step 1: User connects email accounts

* Supports multiple Gmail accounts
* Each account is linked to one user identity
* Emails are merged into a unified stream

---

### Step 2: System ingests emails

* Emails are fetched periodically
* Parsed into structured format
* Stored in a normalized database

---

### Step 3: AI processes emails per day

For each day:

* All emails are grouped
* AI analyzes them collectively
* Generates a **Daily Report**

---

### Step 4: User opens app

Instead of inbox, user sees:

> “Today’s Intelligence”

---

## 4. UI Structure (Strict Layout)

Based on your concept, enforce a **3-panel system**

---

## LEFT PANEL — Navigation

Purpose: **Time + Context control**

Contains:

* Date-based navigation (Today, Yesterday, Past days)
* Account filters (if multiple emails connected)
* Categories (optional: Work, Personal, Finance)

Behavior:

* Selecting a day updates the middle panel
* No email list shown

---

## MIDDLE PANEL — Daily Digest (CORE PRODUCT)

This is the most important part of the app.

Each day renders a structured report:

### Sections:

#### 1. Summary

* 3–5 bullet points
* High-level understanding of the day

---

#### 2. Tasks

* Extracted actionable items
* Example:

  * “Reply to John about meeting”
  * “Submit project report”

---

#### 3. Deadlines

* Time-sensitive items
* Highlight urgency

---

#### 4. Important Threads

* Key conversations summarized
* Include:

  * who
  * what
  * current state

---

#### 5. Insights (optional but powerful)

* Patterns or observations:

  * “You received 5 job-related emails”
  * “2 follow-ups pending”

---

#### 6. Source Traceability (CRITICAL)

Each item must allow:
→ “View source email”

This builds trust.

---

## RIGHT PANEL — AI Chat (Action Engine)

This is not generic chat.

It is **context-aware assistant**

Capabilities:

* Draft replies
* Modify tasks
* Answer questions about emails
* Re-generate summaries
* Explain decisions

---

## 5. AI Responsibilities

AI is the brain of the system.

It must:

### 1. Understand emails

* Extract intent, not just text
* Identify:

  * requests
  * commitments
  * deadlines
  * tone

---

### 2. Compress information

* Remove noise
* Keep only meaningful data

---

### 3. Structure outputs

Always output in:

* tasks
* summaries
* deadlines
* insights

---

### 4. Maintain accuracy

* Never hallucinate missing data
* If unsure → mark as uncertain

---

## 6. Data Model (Conceptual)

### Entities:

#### User

* authenticated via Better Auth

---

#### Email Account

* multiple per user
* stores OAuth tokens

---

#### Email

* raw + parsed content
* linked to account

---

#### Daily Report

* generated per date
* contains structured AI output

---

#### Memory (optional)

* stores user preferences
* writing style
* recurring patterns

---

## 7. Technology Stack (Recommended)

### Frontend

* Nuxt 3 (you already use it)
* Tailwind CSS (for theming)

---

### Backend

* Node/Nitro (Nuxt server)
* PostgreSQL (structured data)
* Drizzle ORM

---

### Auth

* Better Auth

---

### Email Integration

* Gmail API
* OAuth 2.0 with refresh tokens

---

### AI Layer

* Vercel AI SDK or similar
* LLM for:

  * extraction
  * summarization
  * chat

---

### Storage

* Supabase / S3 for attachments (optional)

---

## 8. Processing Pipeline

### Stage 1: Fetch

* Pull emails from Gmail API
* Store raw data

---

### Stage 2: Normalize

Convert into:

* clean text
* metadata

---

### Stage 3: Group

Group emails by:

* date (daily buckets)

---

### Stage 4: AI Processing

For each day:

* send emails to AI
* receive structured output

---

### Stage 5: Store Report

* save daily report
* allow regeneration

---

## 9. Multi-Account Handling

* All emails merged into one timeline
* Maintain source account internally
* Allow filtering per account if needed

---

## 10. Sync Strategy

### MVP:

* periodic polling (every few minutes)

### Later:

* Gmail push notifications

---

## 11. UX Principles

### 1. Zero clutter

* no inbox
* no thread lists

---

### 2. High trust

* always show source references

---

### 3. Minimal decisions

* user should instantly know:
  → what matters
  → what to do

---

### 4. Controlled AI

* AI suggests
* user confirms

---

## 12. Risks & Constraints

### 1. AI errors

Mitigation:

* traceability
* conservative extraction

---

### 2. Token handling

* secure storage
* auto refresh

---

### 3. Cost

* batch processing
* limit AI calls

---

### 4. Over-automation

* never silently modify user data

---

## 13. MVP Definition (Strict)

Must include:

* Gmail connection (multi-account)
* Email ingestion
* Daily grouping
* AI summary + tasks
* Daily UI view
* Basic AI chat
* Source email view

Exclude:

* calendar integration
* deep memory system
* advanced analytics

---

## 14. Product Positioning

This is NOT:

* an email client
* an AI assistant

This IS:

> A system that converts email into a daily action plan

---

## 15. Expected Outcome

When a user opens Bubbles, they should feel:

* clarity instead of overwhelm
* direction instead of confusion
* control instead of chaos

---

## 🔚 Final Line (guiding constraint)

Every feature must answer:

> “Does this help the user understand and act on their day faster?”

If not, it does not belong.

---
![MY LAYOUT FOR DESIGN](.info2ai/image-1.png)

