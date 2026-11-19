# Analytics: what appeal-the-denial records

Started 2026-11-19. Before that the connector had no tracking at all, so nothing before that date
can be read.

PostHog project 521313 (key in `lib/posthog.html`), every event tagged `site: appeal-the-denial`.
Vercel Web Analytics counts page views. Read with `~/.claude/skills/site-analytics` or HogQL,
filtering `properties.site = 'appeal-the-denial'`.

## The health rule

People paste insurance letters here. **No letter text, name, member or claim number, date,
insurer, provider or service denied goes into any event, URL query string or server log.** The
allowed properties are the plan type (`erisa`, `medicare_advantage`, …), the denial reason
category (`medical_necessity`, `prior_auth`, …), booleans and coarse bands. `tests/mcp.test.js`
fails if an MCP event carries any part of the sample letter.

`lib/posthog.html` is the shared PostHog block with autocapture, rage and dead clicks, heatmaps,
surveys and session replay OFF and all text masked. Do not swap in the plain shared block
(`posthog_inject.py`): it would record what is on the screen. `tests/pages.test.js` checks every
page carries this one. Hand-written pages get it from `node scripts/inject_analytics.mjs`;
generated pages from `scripts/build.mjs`.

## Counting people who came from the chat

Claude's connector calls arrive from Anthropic's servers, so a server-side id from IP + user agent
counts Anthropic, not people (heistclips, 2026-11-19). `mcp_tool_call` therefore gets a random id
per call and counts **calls**. **People** are counted on the web: `appeal_open` with
`entry = 'mcp'` (the `src=mcp` on every link the connector hands out), one PostHog person each.

```sql
select count(distinct person_id) from events
where event = 'appeal_open' and properties.entry = 'mcp' and properties.payload = 'link'
  and timestamp > '2026-11-19'
```

## Server

| Event | Where | Properties |
|---|---|---|
| `mcp_tool_call` | `api/mcp.js`, one per tool call | `tool`, `ok`, `ms`, `client` (`claude`, `chatgpt`, `grok`, `cursor`, `script`, `other`, from the user agent), `client_ua` (first word of it), `plan_type`, `reason_category` (read_denial_letter only), `deadline_found`, `days_left_band` (`past`, `0-14`, `15-60`, `61-120`, `121+`), `link` (true: a link was handed back), `err` (`no_deadline`, `exception`), `test` (true when the call sent `x-atd-test: 1`) |

## Browser

Every event carries the super properties `site`, `entry` (the visit's `src`, else `direct`) and,
once per browser, `first_src`.

| Page | Event | Properties |
|---|---|---|
| `/appeal` | `appeal_open` | `payload` (`link` = opened filled in, `missing`, `bad`), `plan_type`, `reason_category`, `deadline_found`, `days_left_band`, `has_send_to` |
| `/appeal` | `paste_read` | same as `appeal_open`, when a letter was pasted on the page instead |
| `/appeal` | `ics_download`, `gcal_click`, `copy_letter`, `print_letter`, `letter_edited` (once), `rates_click` | |
| `/` | `read_letter` | `plan_type`, `reason_category`, `deadline_found`, `sample` (a sample letter was showing) |
| `/` | `sample_letter` (`ex`), `copy_letter`, `checkout_click` | |
| `/packet.html` | `ics_download` (`from: packet`) | |
| `/denial-rates/…` | `rates_cta` | `from` (`rates-index`, `rates-state-<state>`, `rates-insurer`) |

Links from the rate pages to the tool carry `src=rates`.

## Checking that an event arrives

The block does not load when `navigator.webdriver` is true, so a plain headless run sends nothing
(and never pollutes the counts). To see real events, see the site-analytics skill ("Headless never
counts"). A test call to `/mcp` sends `x-atd-test: 1`.
