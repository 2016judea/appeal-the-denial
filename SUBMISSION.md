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

## Left for Aidan
1. **OpenAI identity verification.** The headless browser reached platform.openai.com's login page. Picking his Google account landed on Google's chooser marked "Signed out", which is the passkey re-auth gate, so the settings page was never seen. His steps:
   1. Sign in at platform.openai.com.
   2. Select the organization that will publish.
   3. Go to Settings → Organization → General (`platform.openai.com/settings/organization/general`).
   4. Complete **individual verification** (publishes under his own name) or **business verification** (publishes as the LLC). Pick one, because the directory shows that name. Verification may take a couple of days.
   5. Submit from the same org/project where he verified.
2. **ChatGPT domain check.** The submission form issues a token. Serve it as plain text at `https://appeal-the-denial.vercel.app/.well-known/openai-apps-challenge`. This is a code change once he has the token.
3. **Submit for review**: ChatGPT at platform.openai.com/plugins; Claude at claude.ai/directory/manage. Nothing was submitted.
4. Support URL for ChatGPT: the site or `aidan@brickandmortar.dev`.
