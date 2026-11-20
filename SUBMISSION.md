# Directory submission kit (not submitted — Aidan submits)

**Server URL:** `https://appeal-the-denial.vercel.app/mcp` (Streamable HTTP, stateless, no auth)
**Privacy policy:** https://appeal-the-denial.vercel.app/privacy.html
**Website:** https://appeal-the-denial.vercel.app
**Support:** aidan@brickandmortar.dev
**Tools:** `read_denial_letter`, `appeal_deadlines` — both `readOnlyHint: true`, no writes, no external calls, nothing stored.

## Name and one-liner
**Appeal the Denial** — Paste your health insurance denial, get the appeal and the deadlines.

## Description (long)
Reads a health insurance denial letter, EOB or adverse benefit determination and returns:
what was denied and the reason the insurer gave; which rules apply (employer/ERISA,
Marketplace, Medicare Advantage, Medicaid, Original Medicare, FEHB); the appeal deadline,
computed in code from the federal regulation and cited to it (29 CFR 2560.503-1, 45 CFR
147.136, 42 CFR 422 subpart M, 42 CFR 438); who decides next; and a draft appeal letter.
It never judges whether care was medically necessary and gives no medical advice; it asks
for a letter from the person's own doctor. Free. No account. Keeps nothing.

## Category
Claude: Legal / Health. ChatGPT: Lifestyle or Productivity (health-adjacent; no medical advice).

## Policy notes for reviewers
- No in-app sales, upsells or links to paid products. The tools return only the free answer.
  (ChatGPT apps may not sell digital goods in-app; Claude directory bans money-moving.)
- No tailored medical advice: tool descriptions instruct the host not to judge medical
  necessity; every output carries that line.
- Deadlines are never model-generated; the host is told to show them as returned.
- Health data: the letter exists only for the request. No logs of bodies, no storage.

## Test prompts (with expected results)
1. Paste `examples/erisa_mri.txt` + "What's my deadline and what do I send?"
   → read_denial_letter; deadline Mon, April 12, 2027 (29 CFR 2560.503-1(h)(3)(i)); ERISA, self-funded note; draft letter.
2. Paste `examples/medicare_advantage_pt.txt` + "Help me appeal this."
   → Medicare Advantage; reconsideration by Mon, December 21, 2026 (the letter's 60 days from notice date is earlier than 42 CFR 422.582(b)'s receipt + 60); auto-forward to IRE note.
3. Paste `examples/medicaid_mco_drug.txt`
   → Medicaid managed care; appeal by Fri, January 1, 2027 (42 CFR 438.402(c)(2)(ii)).
4. "My Medicare Advantage plan denied a claim in a letter dated October 30, 2026. When's my appeal due?"
   → appeal_deadlines; Sun, January 3, 2027 (Oct 30 + 5 presumed receipt + 60).
5. "My employer plan denied my final appeal on October 30, 2026. What now?" (plan_type erisa, internal_appeal_level final)
   → external review by Mon, March 1, 2027 (the regulation's own Oct 30 → Mar 1 example).
6. Negative: "Was my MRI medically necessary?" → the model should decline to judge and point to the doctor's letter.

## Screenshots
Web: `submission/web-phone.png`, `submission/web-desktop.png`.

In-chat, run 2026-11-03 on Aidan's own accounts (Claude: Opus 5.5 with the custom connector;
ChatGPT: developer-mode plugin, invoked with `@Appeal the Denial`). `N.png` is the top of the
answer, `N-end.png` the bottom.

| # | Claude | ChatGPT | Result |
|---|--------|---------|--------|
| 1 | `screenshots/claude-1.png` | `screenshots/chatgpt-1.png` | both: Mon, April 12, 2027, 29 CFR 2560.503-1(h)(3)(i), draft letter |
| 2 | `screenshots/claude-2.png` | `screenshots/chatgpt-2.png` | both: Mon, December 21, 2026, auto-forward to IRE |
| 3 | `screenshots/claude-3.png` | `screenshots/chatgpt-3.png` | both: Fri, January 1, 2027, 42 CFR 438.402(c)(2)(ii) |
| 4 | `screenshots/claude-4.png` | `screenshots/chatgpt-4.png` | both: Sun, January 3, 2027 |
| 5 | `screenshots/claude-5.png` | `screenshots/chatgpt-5.png` | both: Mon, March 1, 2027, 29 CFR 2590.715-2719(d)(2)(i) |
| 6 | `screenshots/claude-6.png` | `screenshots/chatgpt-6.png` | no tool call in either. Claude declines to judge and points to the doctor's letter. ChatGPT opens "Possibly." and offers to "determine whether the insurer's reasoning is defensible", though it still says the treating physician makes the clinical case. That is softer than the policy note claims |

No server errors on any prompt.

## Icon
`submission/icon/icon.svg`, `icon-512.png`, `icon-1024.png` (plus `icon-64.png`, the legibility check).
It shows a cream letter with an ink arrow pointing up, on the site's red (#b3261e). There are no brand marks.
`icon-512.png` is 4.9 KB, which fits ChatGPT's 10 KB PNG limit. It is already the icon on the ChatGPT dev plugin.

## Done 2026-11-03
- Claude: custom connector "Appeal the Denial" added (no sign-in), both tools set to Always allow.
- ChatGPT: custom MCP server added as a dev-mode plugin (`asdk_app_6aea6c45e4288191be944ca97e43de29`, no auth, review status DEVELOPMENT) and connected.
- All 6 prompts were run in both apps. The screenshots are listed above.

## Submitted 2026-11-03
- **ChatGPT:** plugin ZIP 1.0.1 (`scripts/build_chatgpt_plugin.py` → `chatgpt-plugin.zip`) uploaded at platform.openai.com/plugins under **Business — Brick and Mortar AI LLC**; domain verified (token in `public/.well-known/openai-apps-challenge`); demo video `public/demo/chatgpt-review.mp4` (8 test prompts, noindex). Status: **1.0.1 · In review**. Remaining scan findings were the generic "new tool needs review" only.
- **Claude:** MCP connector submitted at claude.ai/directory/manage, slug `appeal-the-denial`, categories Consumer Health + Legal, personal health data = Yes (processed, not stored). Status: **submitted for review**; Anthropic replies to aidan@brickandmortar.dev.
- Server changes made during submission: annotation titles; `appeal_deadlines` takes no names or member/claim IDs (OpenAI scan flag); tool descriptions describe rather than instruct (Claude attestation). The OpenAI stored tool snapshot predates the description change; if review flags a mismatch, Rescan + upload a new version.

## Changed 2026-11-19 (both reviews still open)
- **Unchanged:** tool names, descriptions, input schemas and annotations. That is what OpenAI's
  stored tool snapshot covers, so today's change needs **no rescan and no new version**.
- **Changed:** server version 1.1.0. Each result now ends with a link to the free page
  `/appeal?src=mcp#…` (deadline, where to send it, the letter, a calendar file; nothing is sold
  on it) and carries `open_url` in `structuredContent`; read_denial_letter adds a "Send it to"
  line copied from the letter. Server instructions add: "Show the open link exactly as returned,
  in full." The letter's facts ride in the URL fragment, which no server receives.
- **Analytics added:** one anonymous `mcp_tool_call` event per call (tool, ok, duration, client,
  plan type, reason category; no letter content). The privacy policy at the same URL says so,
  updated 2026-11-19. "Personal health data: processed, not stored" is still true.
- **For Aidan, only if a reviewer asks:** if OpenAI flags a tool mismatch (from the 11/03
  description change, not this one), open platform.openai.com/plugins → Appeal the Denial →
  **Rescan**, then `python3 scripts/build_chatgpt_plugin.py` and upload the new ZIP as 1.0.2.
  If either reviewer asks about data collection, point them at the privacy page.

## Changes required 2026-11-19
**Not resubmitted. OpenAI excludes this category, so the only change that could pass is a
change to what the tool does, and that decision is Aidan's.**

**Where the ask lives.** The portal (platform.openai.com/plugins/manage/plugin_asdk_app_6aea704faa8c819197412fcaf90fc317)
shows only the banner *"The last review of your plugin found issues. Address the feedback and
submit a new version."* Its MCP findings are the 11/03 scan's generic "needs further review". The
reviewer's text arrived only by email: "ChatGPT Plugin Submission Rejected
[asdk_app_6aea704faa8c819197412fcaf90fc317]", from openai-review@tm.openai.com to
**aidanjude2016@gmail.com** (not the business inbox), Tue 17 Nov 2026 19:42 UTC. It was written in German.

**Reviewer's request, verbatim:**
> Vielen Dank für deine Einreichung. Nach der Prüfung haben wir festgestellt, dass dein Plugin
> einem Anwendungsfall im Gesundheitswesen oder in der Medizin zuzuordnen ist, den das
> Plugin-Ökosystem von ChatGPT derzeit nicht unterstützt.
>
> Wir wissen, wie wichtig diese Anwendungsfälle sind. Trotzdem sind Plugins, die
> Gesundheitsdienstleistungen oder entsprechende Arbeitsabläufe unterstützen (etwa den Zugang zu
> medizinischer Versorgung, die Vermittlung geeigneter Gesundheitsdienstleister oder
> Aktivitäten, bei denen Gesundheitsinformationen eine Rolle spielen können), derzeit nicht für
> die Bereitstellung durch Drittanbieter auf der Plattform vorgesehen. Diese Entscheidung beruht
> auf dem aktuellen Entwicklungsstand der Plattform und bewertet nicht die Qualität deines Plugins.

**In English:** your plugin falls under a healthcare or medical use case that ChatGPT's plugin
ecosystem does not currently support. Plugins that support health services or related
workflows are not currently open to third parties. The examples given are access to medical
care, matching people with suitable providers, and *activities in which health information
may play a role*. The decision reflects where the platform is now and does not judge the
plugin's quality. The email adds: *"If you have questions or believe we have made an error in
our review, reply directly to this email to initiate an appeal."*

**What I changed: nothing.** No server change, no new ZIP, no resubmit. Any version that reads
a denial letter handles health information, and that is the activity the email names.
Resubmitting 1.0.1 or a 1.0.2 with the same tools would draw the same ruling.

**Status read back from the portal, 2026-11-19 17:50 CST:** Review status **Changes required**,
Publication **Not published**, Metadata & skills version **1.0.1 · Changes required**, MCPs tab
**Needs attention**. Only one version exists. The Claude directory submission is separate and
unaffected.

**For Aidan, pick one:**
1. **Accept it.** ChatGPT is closed to this tool for now. The Claude listing and the website
   carry it.
2. **Appeal.** Reply to the 11/17 email from aidanjude2016@gmail.com. A draft is below; I can't
   send it, and the claude.ai Gmail connector is not linked, so it is not in his Gmail drafts.
   Its last paragraph offers a deadlines-only build. Keep that paragraph only if he would ship
   that build.
3. **Reframe.** Split out a ChatGPT-only app with just `appeal_deadlines` (plan type and the
   letter's date in, regulation-cited deadlines out, no letter text, no service, no reason).
   Even that may still read as "access to medical care". It's a product call, not a fix.

**Draft reply (option 2). Draft, not sent.**

    Subject: Re: ChatGPT Plugin Submission Rejected [asdk_app_6aea704faa8c819197412fcaf90fc317]

    Hello,

    I'd like to appeal the decision on Appeal the Denial.

    The plugin doesn't deliver care, find a provider or weigh in on treatment. It does insurance
    paperwork. Someone pastes the denial letter their insurer sent, and it tells them which
    appeal rules apply, when the appeal is due, and drafts the letter. The deadline is computed
    in code from the federal claims rules (29 CFR 2560.503-1, 45 CFR 147.136, 42 CFR 422
    subpart M) and cited to them. It's a legal-deadline calculator more than a health app.

    It never judges whether care was medically necessary and gives no medical advice. The draft
    asks for a letter from the person's own doctor. Both tools are read-only, and the letter is
    used for the one request and never stored.

    But the letter itself carries health information, and I understand if that's the line. If it
    is, I can ship a version that takes only the plan type and the date on the denial, and
    returns the deadlines.

    Best,
    Aidan

## Appeal sent 2026-11-19
Aidan chose option 2. Sent from aidanjude2016@gmail.com as a reply to the 11/17 rejection
(Gmail thread 1a1eb086f39f34da), to openai-review@openai.com, in English. Sent the draft above
**without its last paragraph**: no deadlines-only build is offered, because he hasn't committed to
shipping one. Watch the same Gmail thread (personal inbox, may come back in German).

Same day, Claude directory (read off his screenshot of claude.ai/directory/manage): Appeal the
Denial is **Published** there, updated 2026-11-17.
