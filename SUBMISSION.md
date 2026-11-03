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
`submission/web-phone.png`, `submission/web-desktop.png`. In-chat screenshots need a
ChatGPT developer-mode app and a Claude custom connector added by Aidan (logged-in UI).

## Left before submitting
1. Add the connector in Claude (Settings → Connectors → custom) and in ChatGPT developer mode; run the 6 prompts; screenshot the chats.
2. ChatGPT app submission needs a verified OpenAI developer identity and a support URL — both on Aidan's account.
3. Square 512px icon (none made yet).
