# Appeal the Denial

**Live:** https://appeal-the-denial.vercel.app

Paste your health insurance denial. Get the appeal and the deadlines.

It reads the letter and tells you what was denied and why, which rulebook your plan falls
under (employer/ERISA, Marketplace, Medicare Advantage, Medicaid, plus Original Medicare and
FEHB), the date you must appeal by, who decides next, and a draft appeal letter.

- **Free on the web.** The answer is worked out in your browser; the letter is never sent.
- **Free inside ChatGPT and Claude.** A remote MCP server at `https://appeal-the-denial.vercel.app/mcp`
  (tools `read_denial_letter`, `appeal_deadlines`). Read-only, keeps nothing. Every answer ends
  with a link that opens [`/appeal`](https://appeal-the-denial.vercel.app/appeal) already filled
  in: the deadline, where to send it (copied from the letter), the letter to edit and print, and
  a calendar file.
- **Denial rates by insurer** at [`/denial-rates`](https://appeal-the-denial.vercel.app/denial-rates):
  claims denied, prior authorizations denied and appeals won for 136 Marketplace insurers in 29
  states, 2025, computed from CMS's Transparency in Coverage file (posted 2026-10-30; the prior
  authorization counts are new in it). `python3 scripts/build_denial_data.py` rebuilds
  `data/denial-rates-2025.json` from CMS; the pages, CSV, JSON, `llms.txt`, `llms-full.txt` and
  `sitemap.xml` are generated from it at build time.
- **$29 packet on the website** (never inside the chat apps): finished letter, a claim-file
  request, a letter for your doctor to fill in, an evidence checklist, calendar reminders,
  and the external review / regulator complaint letters.

## How the deadlines are made

Every deadline is date arithmetic in `lib/engine.js` over a rule in `lib/rules.js`. Each rule
carries its citation and a quote copied verbatim from the in-force eCFR text in `regs/`
(`python3 scripts/fetch_regs.py` refreshes it). `npm test` fails if any quote is no longer in
the regulation. No model ever produces a date. If the letter states an earlier deadline,
the earlier one is shown.

The tool never judges whether care was medically necessary. That argument is the doctor's,
and the packet asks for it.

## The link back from the chat, and health data

The letter's facts ride in the link's fragment (`/appeal?src=mcp#v=1&ld=…`), not in a query
string and not in a server-side token. Browsers never send a fragment to any server, and
`/appeal` removes it from the address bar before any analytics script loads. A token would have
meant storing health information on our side, even for an hour, which both directory submissions
say we don't do. The chat that gets the link already holds the whole letter. Full reasoning:
`lib/share.js`. What is and isn't recorded: `ANALYTICS.md`.

## Run it

    npm install
    npm test                 # 24 tests (builds the site first)
    node scripts/build.mjs   # free engine into public/, then the denial-rate pages and data files
    node scripts/inject_analytics.mjs   # after editing lib/posthog.html
    python3 ~/.claude/skills/vercel-api/indexnow_ping.py appeal-the-denial.vercel.app   # after a deploy that adds pages

Deploys from `main` on Vercel. Env: `STRIPE_SECRET_KEY`, `PAYMENT_LINK_ID`.

`DATA_MODEL.md` is the ideal model, written first. `SUBMISSION.md` has the directory
listing materials.

MIT licence.

## Expectation

Written 2026-11-19, before the link and the rate pages went live. **Read on 2027-01-15.**

January is the date: plan years reset on January 1, prior authorizations start over, and
denials pile up in the first weeks. The question is whether people who ask an assistant about
a denial reach this tool, and whether people who ask "how often does my insurer deny" reach the
rate pages.

Base rates: heistclips' connector links brought 151 people in 3 days (2026-11-16 to 11-19), 54%
of whom made a clip, but that was around the GTA VI launch with a listed connector. The Brick &
Mortar connector, same channel, got zero human calls in 7 days. This connector is still in
review in both directories (submitted 2026-11-03), and nothing before 2026-11-19 was measured.

| Read on 2027-01-15 | Expected | Surprise up | Surprise down |
|---|---|---|---|
| People landing on `/appeal` from the chat (`appeal_open`, `entry = mcp`, payload `link`) | 10 or fewer | 50 or more | 0 with a directory listing live since before Jan 1 |
| `mcp_tool_call` events (calls, not people) | 30 or fewer | 200 or more | 0: nobody has the connector; January doesn't matter until a directory lists it |
| Visitors to `/denial-rates` pages (Vercel) | about 100 | 500 or more, or 20+ arriving from chatgpt.com / perplexity.ai | under 10: not indexed; check Bing Webmaster Tools |

Queries: `ANALYTICS.md`.
