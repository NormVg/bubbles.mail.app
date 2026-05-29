# Bubbles AI Agent Test Suite

This test suite is designed to push the AI agent to its limits and ensure 100% reliability across all its tools (`searchEmails`, `readThread`, `stageEmailsForSending`), memory, and reasoning capabilities. Run these prompts one by one in the chat.

## Level 1: Simple & Direct (Basic Tool Verification)

These questions test if the agent can correctly identify and trigger a single tool without getting confused.

1. **Basic Search:** "Search my emails for anything related to 'invoice' from the last 30 days."
   * *Expected:* Should call `searchEmails` with query "invoice" and return a summary.
2. **Specific Sender:** "Find the latest email from thenormvg@zo.computer."
   * *Expected:* Should call `searchEmails` filtering by sender.
3. **Basic Draft:** "Draft a quick thank you email to john@example.com for the meeting today."
   * *Expected:* Should call `stageEmailsForSending` with `to`, `subject`, and `body` properly filled out.
4. **Tool Rejection:** "What is the weather like in New York today?"
   * *Expected:* Should gracefully decline or explain it only has access to email data, without hallucinating a tool call.

## Level 2: Moderate (Multi-Step & Contextual)

These questions require the agent to use multiple tools in sequence or maintain context from previous turns.

5. **Search & Read:** "Find the email thread about the 'Q3 Marketing Budget' and summarize the main points discussed."
   * *Expected:* Should call `searchEmails` to find the thread, then (if necessary) call `readThread` using the thread ID, and finally provide a structured summary.
6. **Search & Reply:** "Find the last email I received from Sarah about the design mockups, and draft a reply saying they look great and I approve."
   * *Expected:* Should call `searchEmails`, optionally `readThread`, and then call `stageEmailsForSending` using the `inReplyTo` and `threadId` parameters to ensure it's staged as a proper reply.
7. **Context Retention (Multi-turn):**
   * *Turn 1:* "Who sent the email about the server outage?"
   * *Turn 2:* "Draft an email to that person asking for a full incident report."
   * *Expected:* Should remember the sender from Turn 1 and accurately stage the email to them in Turn 2 without needing you to repeat the email address.

## Level 3: Complex & Edge Cases (Stress Testing)

These questions test the agent's resilience against complex instructions, bulk actions, edge cases, and tool parameter hallucination.

8. **Bulk Staging:** "I need to send 3 separate emails. First, to alice@test.com asking for the Q4 report. Second, to bob@test.com confirming our lunch at 1pm. Third, to charlie@test.com saying his invoice is paid."
   * *Expected:* Should call `stageEmailsForSending` exactly once, passing an array of **3 separate email objects** to the `emails` parameter, correctly handling multiple recipients and subjects.
9. **Account Specification (The "From" fix):** "Draft an email to vendor@supply.com canceling our subscription. Make sure to send it from my billing@mycompany.com account."
   * *Expected:* Should call `stageEmailsForSending` and correctly populate the new `from` parameter with `billing@mycompany.com`.
10. **Complex Search with Negation & Dates:** "Find emails sent to me last week that contain the word 'urgent', but do not contain the word 'resolved'."
    * *Expected:* Should attempt to formulate an advanced Gmail search query (e.g., `urgent -resolved newer_than:7d`) and pass it to `searchEmails`.
11. **Tool Overload / Hallucination Test:** "Can you delete the email from spam@junk.com and also create a calendar event for tomorrow at 3 PM?"
    * *Expected:* The agent must recognize it does *not* have a `deleteEmail` tool or a `createCalendarEvent` tool. It should state clearly what it can and cannot do, and refrain from hallucinating fake tool names.
12. **Empty States & Graceful Failure:** "Summarize the emails I received from non.existent.user@nowhere.com."
    * *Expected:* Should call `searchEmails`, receive an empty array/result, and politely inform you that no emails were found, rather than making up information.

## How to use this list:
Copy and paste these prompts into your Bubbles AI chat. Watch the "Thought process" dropdown to see if it correctly plans its actions, and ensure the UI renders the Staged Emails (with From, To, Subject, and Body) exactly as expected without throwing any backend errors!
