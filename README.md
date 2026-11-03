# Appeal the Denial

**Live:** https://appeal-the-denial.vercel.app

Paste your health insurance denial. Get the appeal and the deadlines.

It reads the letter and tells you what was denied and why, which rulebook your plan falls
under (employer/ERISA, Marketplace, Medicare Advantage, Medicaid, plus Original Medicare and
FEHB), the date you must appeal by, who decides next, and a draft appeal letter.

- **Free on the web.** The answer is worked out in your browser; the letter is never sent.
- **Free inside ChatGPT and Claude.** A remote MCP server at `https://appeal-the-denial.vercel.app/mcp`
  (tools `read_denial_letter`, `appeal_deadlines`). Read-only, keeps nothing.
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

## Run it

    npm install
    npm test                 # 12 tests
    node scripts/build.mjs   # copies the free engine into public/ for the browser

Deploys from `main` on Vercel. Env: `STRIPE_SECRET_KEY`, `PAYMENT_LINK_ID`.

`DATA_MODEL.md` is the ideal model, written first. `SUBMISSION.md` has the directory
listing materials.

MIT licence.
