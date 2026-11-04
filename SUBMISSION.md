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
