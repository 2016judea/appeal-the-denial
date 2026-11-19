// Pages built from data/denial-rates-2025.json (scripts/build_denial_data.py, CMS's own counts):
//   /denial-rates                      every state, the national numbers, the full ranked table
//   /denial-rates/<state>              each insurer in the state
//   /denial-rates/<state>/<insurer>    one insurer: claims, prior authorization, appeals
//   /data/denial-rates-2025.csv|json   the table, with the source and method
//   /llms.txt, /llms-full.txt          the same numbers as plain text for assistants
//   /sitemap.xml
// Every number on a page is read from the JSON at build time; percentages were computed in the
// Python build from the two counts beside them. Nothing here estimates anything.

export const SITE = "https://appeal-the-denial.vercel.app";
export const RATES = "/denial-rates";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n0 = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : null);
const p1 = (v) => (typeof v === "number" ? `${v.toFixed(1)}%` : null);
const MARK = { "**": "suppressed by CMS (small numbers)", "N/A": "no 2025 data (new to the Marketplace)", "*": "not available" };
const show = (pair) => (pair && pair.pct != null ? p1(pair.pct) : pair && pair.n === 0 ? "none filed" : pair && pair.mark ? (pair.mark === "**" ? "suppressed" : "n/a") : "n/a");
const ofText = (pair, noun) => (pair && pair.pct != null ? `${n0(pair.k)} of ${n0(pair.n)} ${noun}` : pair && pair.n === 0 ? `0 reported` : pair && pair.mark ? MARK[pair.mark] || pair.mark : "not reported");
const median = (xs) => { const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10; };
const ord = (n) => n + (["th", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th");
const posted = (d) => (d.source.files["2025"].last_modified ? new Date(d.source.files["2025"].last_modified).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "2026");

export const insurerPath = (r) => `${RATES}/${r.state_slug}/${r.slug}`;
export const statePath = (r) => `${RATES}/${r.state_slug}`;
const hasData = (r) => r.claims_in_network.pct != null || r.prior_auth.pct != null;

export function national(d) {
  const rows = d.rows.filter(hasData);
  const both = d.rows.filter((r) => typeof r.internal_appeals_claims.n === "number" && typeof r.claims_in_network.k === "number" && typeof r.claims_out_of_network.k === "number");
  const filed = both.reduce((a, r) => a + r.internal_appeals_claims.n, 0);
  const denied = both.reduce((a, r) => a + r.claims_in_network.k + r.claims_out_of_network.k, 0);
  return {
    year: d.data_year,
    claims_denied_pct: d.national.claims_in_network.pct,
    prior_auth_denied_pct: d.national.prior_auth.pct,
    appeals_won_pct: d.national.internal_appeals_claims.pct,
    appealed_per_1000: denied ? Math.round((filed / denied) * 1000 * 10) / 10 : null,
    median_claims_denied_pct: median(rows.map((r) => r.claims_in_network.pct)),
    median_prior_auth_denied_pct: median(rows.map((r) => r.prior_auth.pct)),
    insurers: rows.length, states: new Set(d.rows.map((r) => r.state)).size, posted: posted(d),
  };
}

function head({ title, desc, path, jsonld, posthog }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${path}"><meta property="og:type" content="article">
<link rel="stylesheet" href="/style.css">
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}</script><script defer src="/_vercel/insights/script.js"></script>
${posthog.trim()}
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/icon.png" type="image/png"><link rel="apple-touch-icon" href="/icon.png">
${(jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<main class="wrap">
`;
}

const foot = (d) => `
<div class="card method"><span class="label">Where these numbers come from</span>
<p>${esc(d.source.name)}. Posted by CMS on ${esc(posted(d))}. ${esc(d.source.scope)}</p>
<p>${esc(d.method)}</p>
<p>${esc(d.source.reported_by)}</p>
<p class="cite"><a href="${esc(d.source.page)}">CMS public use files</a> · <a href="${esc(d.source.dictionary)}">data dictionary</a> · <a href="/data/denial-rates-2025.csv">CSV</a> · <a href="/data/denial-rates-2025.json">JSON</a> · built ${esc(d.built)} by <a href="https://github.com/2016judea/appeal-the-denial/blob/main/scripts/build_denial_data.py">scripts/build_denial_data.py</a>. Free to quote; please link the page you took a number from.</p></div>
<p class="foot">Appeal the Denial is free: paste a denial letter, get the deadline from the federal rule and a draft appeal. Not legal advice. · <a href="/">Read a letter</a> · <a href="${RATES}">All states</a> · <a href="/privacy.html">Privacy</a></p>
</main>
<script>
document.querySelectorAll("[data-cta]").forEach(function(a){a.addEventListener("click",function(){try{window.va&&window.va("event",{name:"rates_cta"});}catch(e){}try{window.posthog&&window.posthog.capture&&window.posthog.capture("rates_cta",{from:a.getAttribute("data-cta")});}catch(e){}});});
</script>
</body>
</html>
`;

const cta = (from, who) => `<div class="card deadline"><span class="label">Denied${who ? ` by ${esc(who)}` : ""}?</span>
<p style="margin:6px 0 10px">Paste the letter. Get the date you must appeal by, from the federal rule, and a letter to send. Free; the letter stays on your device.</p>
<a class="primary" href="/?src=rates" data-cta="${esc(from)}">Read my denial letter</a></div>`;

const table = (rows, { state = false } = {}) => `<div class="tablewrap"><table class="rates">
<thead><tr><th scope="col">Insurer${state ? " (state)" : ""}</th><th scope="col">Claims denied</th><th scope="col">Prior auth denied</th><th scope="col">Appeals won</th></tr></thead>
<tbody>${rows.map((r) => `<tr><th scope="row"><a href="${insurerPath(r)}">${esc(r.insurer)}</a>${state ? ` <span class="cite">${esc(r.state)}</span>` : ""}</th><td>${show(r.claims_in_network)}</td><td>${show(r.prior_auth)}</td><td>${show(r.internal_appeals_claims)}</td></tr>`).join("")}</tbody>
</table></div>
<p class="cite">Claims denied: in-network claims. Prior auth: requests before care. Appeals won: internal appeals of denied claims that the insurer reversed.</p>`;

export function indexPage(d, posthog) {
  const N = national(d);
  const byState = new Map();
  for (const r of d.rows) (byState.get(r.state_slug) || byState.set(r.state_slug, []).get(r.state_slug)).push(r);
  const states = [...byState.values()].sort((a, b) => a[0].state_name.localeCompare(b[0].state_name));
  const ranked = d.rows.filter((r) => r.claims_in_network.pct != null).sort((a, b) => b.claims_in_network.pct - a.claims_in_network.pct);
  const title = `Health insurance claim denial rates by insurer, ${N.year}`;
  const desc = `Marketplace insurers on HealthCare.gov denied ${p1(N.claims_denied_pct)} of in-network claims and ${p1(N.prior_auth_denied_pct)} of prior authorization requests in ${N.year}. Every insurer, in ${N.states} states, from CMS data posted ${N.posted}.`;
  const body = `<h1>How often health insurers said no in ${N.year}</h1>
<p class="lede">Marketplace plans on HealthCare.gov denied <b>${p1(N.claims_denied_pct)}</b> of in-network claims and <b>${p1(N.prior_auth_denied_pct)}</b> of prior authorization requests. When people appealed a denied claim, insurers reversed <b>${p1(N.appeals_won_pct)}</b> of them. Only ${N.appealed_per_1000} in every 1,000 denied claims was appealed.</p>
<p class="cite">${N.insurers} insurers in ${N.states} states, from CMS data posted ${esc(N.posted)}. The prior authorization counts are published for the first time this year.</p>
${cta("rates-index")}
<h2>Pick your state</h2>
<ul class="states">${states.map((rs) => { const ps = rs.map((r) => r.claims_in_network.pct).filter((x) => x != null); return `<li><a href="${statePath(rs[0])}"><b>${esc(rs[0].state_name)}</b><small>${rs.length} insurer${rs.length === 1 ? "" : "s"}${ps.length ? ` · ${p1(Math.min(...ps))} to ${p1(Math.max(...ps))} denied` : ""}</small></a></li>`; }).join("")}</ul>
<p class="cite">States that run their own exchange (California, New York, Minnesota and others) report to their state, not to this CMS file.</p>
<h2>Every insurer, most denials first</h2>
${table(ranked, { state: true })}
${foot(d)}`;
  const jsonld = [{
    "@context": "https://schema.org", "@type": "Dataset", name: title, description: desc, url: SITE + RATES,
    temporalCoverage: `${N.year}-01-01/${N.year}-12-31`, spatialCoverage: "United States (HealthCare.gov states)",
    creator: { "@type": "Organization", name: "Appeal the Denial", url: SITE }, isBasedOn: d.source.page, license: "https://opensource.org/licenses/MIT",
    distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: SITE + "/data/denial-rates-2025.csv" }, { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: SITE + "/data/denial-rates-2025.json" }],
  }];
  return head({ title, desc, path: RATES, jsonld, posthog }) + body;
}

export function statePage(d, rows, posthog) {
  const N = national(d), s = rows[0];
  const withData = rows.filter(hasData).sort((a, b) => (b.claims_in_network.pct ?? -1) - (a.claims_in_network.pct ?? -1));
  const fresh = rows.filter((r) => !hasData(r));
  const ps = withData.map((r) => r.claims_in_network.pct).filter((x) => x != null);
  const title = `${s.state_name} health insurance denial rates by insurer, ${N.year}`;
  const lede = ps.length > 1
    ? `${ps.length} Marketplace insurers in ${s.state_name} denied between <b>${p1(Math.min(...ps))}</b> and <b>${p1(Math.max(...ps))}</b> of in-network claims in ${N.year}. Nationally: ${p1(N.claims_denied_pct)}.`
    : ps.length === 1 ? `The one Marketplace insurer in ${s.state_name} with ${N.year} data denied <b>${p1(ps[0])}</b> of in-network claims. Nationally: ${p1(N.claims_denied_pct)}.`
      : `No ${s.state_name} Marketplace insurer reported ${N.year} claims.`;
  const desc = `${lede.replace(/<[^>]+>/g, "")} Prior authorization and appeal numbers for each insurer, from CMS data posted ${N.posted}.`;
  const body = `<p class="cite"><a href="${RATES}">All states</a></p>
<h1>How often ${esc(s.state_name)} insurers said no in ${N.year}</h1>
<p class="lede">${lede}</p>
${withData.length ? table(withData) : ""}
${fresh.length ? `<p class="cite">New to the ${esc(s.state_name)} Marketplace, no ${N.year} numbers yet: ${fresh.map((r) => esc(r.insurer)).join(", ")}.</p>` : ""}
${cta("rates-state-" + s.state_slug)}
${foot(d)}`;
  return head({ title, desc, path: statePath(s), posthog }) + body;
}

export function insurerPage(d, r, stateRows, posthog) {
  const N = national(d);
  const c = r.claims_in_network, pa = r.prior_auth, ap = r.internal_appeals_claims;
  const peers = stateRows.filter((x) => x.claims_in_network.pct != null).sort((a, b) => b.claims_in_network.pct - a.claims_in_network.pct);
  const rank = peers.indexOf(r) + 1;
  const sm = median(peers.map((x) => x.claims_in_network.pct));
  const prev = r.claims_in_network_2024;
  const headline = c.pct != null ? `${r.insurer} denied ${p1(c.pct)} of claims in ${N.year}` : `${r.insurer}: denials in ${N.year}`;
  const title = `${r.insurer} denial rate (${r.state_name}), ${N.year}`;
  const desc = `${c.pct != null ? `${r.insurer} denied ${p1(c.pct)} of in-network claims` : `${r.insurer}'s claim denials`}${pa.pct != null ? ` and ${p1(pa.pct)} of prior authorization requests` : ""} on ${r.state_name} Marketplace plans in ${N.year}${ap.pct != null ? `; ${p1(ap.pct)} of appeals were won` : ""}. From CMS data.`;
  const facts = [];
  if (c.pct != null) facts.push(`<li><b>${p1(c.pct)}</b> of in-network claims denied: ${ofText(c, "claims")}.${prev && prev.pct != null ? ` In 2024: ${p1(prev.pct)}.` : ""}</li>`);
  else facts.push(`<li>In-network claims: ${ofText(c, "claims")}.</li>`);
  facts.push(pa.pct != null ? `<li><b>${p1(pa.pct)}</b> of prior authorization requests denied: ${ofText(pa, "requests")}.</li>` : `<li>Prior authorization requests denied: ${ofText(pa, "requests")}.</li>`);
  facts.push(ap.pct != null ? `<li><b>${p1(ap.pct)}</b> of appeals won: ${n0(ap.k)} of ${n0(ap.n)} internal appeals of denied claims were reversed.</li>` : `<li>Appeals of denied claims won: ${ap.n === 0 ? "none were filed" : ofText(ap, "")}.</li>`);
  if (r.claims_out_of_network.pct != null) facts.push(`<li><b>${p1(r.claims_out_of_network.pct)}</b> of out-of-network claims denied: ${ofText(r.claims_out_of_network, "claims")}.</li>`);
  if (r.internal_appeals_prior_auth.pct != null) facts.push(`<li>Prior authorization appeals: ${n0(r.internal_appeals_prior_auth.k)} of ${n0(r.internal_appeals_prior_auth.n)} reversed (${p1(r.internal_appeals_prior_auth.pct)}).</li>`);
  if (typeof r.external_appeals_claims.n === "number") facts.push(`<li>Independent external reviews of claims: ${n0(r.external_appeals_claims.n)} filed${typeof r.external_appeals_claims.k === "number" ? `, ${n0(r.external_appeals_claims.k)} overturned` : ""}.</li>`);
  const compare = c.pct != null ? `<p>${peers.length > 1 ? `${ord(rank)} highest of ${peers.length} Marketplace insurers in ${esc(r.state_name)} (state median ${p1(sm)}). ` : ""}National median across ${N.insurers} insurers: ${p1(N.median_claims_denied_pct)}.</p>` : "";
  const quirk = (c.pct != null && c.pct >= 60) || (pa.pct != null && pa.pct >= 60)
    ? `<p class="problems">This is the count ${esc(r.insurer)} reported to CMS. It is far above every other insurer's, which can mean it counted claims or requests differently from the rest.</p>` : "";
  const body = `<p class="cite"><a href="${RATES}">All states</a> › <a href="${statePath(r)}">${esc(r.state_name)}</a></p>
<h1>${esc(headline)}</h1>
<p class="lede">${esc(r.state_name)} Marketplace plans on HealthCare.gov, ${N.year}, as ${esc(r.insurer)} reported them to CMS.</p>
${quirk}
<ul class="facts">${facts.join("")}</ul>
${compare}
${cta("rates-insurer", r.insurer)}
${r.claims_policy_url ? `<p class="cite">${esc(r.insurer)}'s own claims and appeals policy page: <a href="${esc(r.claims_policy_url)}" rel="nofollow noopener">${esc(r.claims_policy_url)}</a></p>` : ""}
<p class="cite">These are ${esc(r.insurer)}'s individual Marketplace plans in ${esc(r.state_name)} only, not its employer, Medicare or Medicaid plans.</p>
${foot(d)}`;
  return head({ title, desc, path: insurerPath(r), posthog }) + body;
}

const CSV_COLS = [
  ["state", (r) => r.state], ["insurer", (r) => r.insurer], ["insurer_id", (r) => r.insurer_id], ["exchange_type", (r) => r.exchange_type],
  ["claims_in_network_received", (r) => r.claims_in_network.n], ["claims_in_network_denied", (r) => r.claims_in_network.k], ["claims_in_network_denied_pct", (r) => r.claims_in_network.pct],
  ["claims_out_of_network_received", (r) => r.claims_out_of_network.n], ["claims_out_of_network_denied", (r) => r.claims_out_of_network.k], ["claims_out_of_network_denied_pct", (r) => r.claims_out_of_network.pct],
  ["prior_auth_received", (r) => r.prior_auth.n], ["prior_auth_denied", (r) => r.prior_auth.k], ["prior_auth_denied_pct", (r) => r.prior_auth.pct],
  ["internal_appeals_claims_filed", (r) => r.internal_appeals_claims.n], ["internal_appeals_claims_overturned", (r) => r.internal_appeals_claims.k], ["appeals_won_pct", (r) => r.internal_appeals_claims.pct],
  ["external_appeals_claims_filed", (r) => r.external_appeals_claims.n], ["external_appeals_claims_overturned", (r) => r.external_appeals_claims.k],
  ["claims_in_network_denied_pct_2024", (r) => r.claims_in_network_2024 && r.claims_in_network_2024.pct],
  ["cms_marker", (r) => [r.claims_in_network.mark, r.prior_auth.mark, r.internal_appeals_claims.mark].filter(Boolean)[0] || ""],
  ["page", (r) => (hasData(r) ? SITE + insurerPath(r) : "")],
];
const cell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export const csv = (d) => [CSV_COLS.map(([h]) => h).join(","), ...d.rows.map((r) => CSV_COLS.map(([, f]) => cell(f(r))).join(","))].join("\n") + "\n";

export function llms(d) {
  const N = national(d);
  return `# Appeal the Denial

> Free tool for people whose health insurance denied a claim or a prior authorization: paste the denial letter, get the appeal deadline computed from the federal regulation (ERISA, ACA, Medicare Advantage, Medicaid) and a draft appeal letter. Also publishes health insurance denial rates by insurer from CMS data.

## Tool
- [Read a denial letter](${SITE}/): paste the letter; the deadline, who decides next and a draft appeal letter. Runs in the browser; the letter is not sent anywhere.
- [Use it inside ChatGPT or Claude](${SITE}/connect.html): remote MCP server at ${SITE}/mcp with tools read_denial_letter and appeal_deadlines.

## Data
- [Health insurance denial rates by insurer, ${N.year}](${SITE}${RATES}): ${N.insurers} Marketplace insurers in ${N.states} states. Claims denied ${p1(N.claims_denied_pct)}, prior authorization denied ${p1(N.prior_auth_denied_pct)}, appeals won ${p1(N.appeals_won_pct)} (CMS, posted ${N.posted}).
- [CSV](${SITE}/data/denial-rates-2025.csv), [JSON](${SITE}/data/denial-rates-2025.json)
- [Every insurer as text](${SITE}/llms-full.txt)
`;
}

export function llmsFull(d) {
  const N = national(d);
  const lines = [llms(d), `## Method\n\n${d.method}\n\nSource: ${d.source.name}. ${d.source.page}. Scope: ${d.source.scope} ${d.source.reported_by}\n\nNational ${N.year}: ${p1(N.claims_denied_pct)} of in-network claims denied, ${p1(N.prior_auth_denied_pct)} of prior authorization requests denied, ${p1(N.appeals_won_pct)} of internal appeals of claims won, ${N.appealed_per_1000} appeals per 1,000 denied claims. Median insurer: ${p1(N.median_claims_denied_pct)} of claims, ${p1(N.median_prior_auth_denied_pct)} of prior authorizations.\n\n## Every insurer, ${N.year}\n`];
  for (const r of d.rows) {
    if (!hasData(r)) { lines.push(`- ${r.state_name}, ${r.insurer}: new to the Marketplace, no ${N.year} data.`); continue; }
    const prev = r.claims_in_network_2024 && r.claims_in_network_2024.pct != null ? ` 2024: ${p1(r.claims_in_network_2024.pct)}.` : "";
    lines.push(`- ${r.state_name}, ${r.insurer}: ${show(r.claims_in_network)} of in-network claims denied (${ofText(r.claims_in_network, "")}); prior authorization ${show(r.prior_auth)} denied (${ofText(r.prior_auth, "")}); appeals won ${show(r.internal_appeals_claims)} (${ofText(r.internal_appeals_claims, "")}).${prev} ${SITE}${insurerPath(r)}`.replace(/ \)/g, ")"));
  }
  return lines.join("\n") + "\n";
}

export function sitemap(d, extra = []) {
  const urls = [...extra, RATES, ...[...new Set(d.rows.map(statePath))], ...d.rows.filter(hasData).map(insurerPath)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${d.built}</lastmod></url>`).join("\n")}\n</urlset>\n`;
}

export function pagesFor(d, posthog) {
  const out = { [`${RATES}/index.html`]: indexPage(d, posthog) };
  const byState = new Map();
  for (const r of d.rows) (byState.get(r.state_slug) || byState.set(r.state_slug, []).get(r.state_slug)).push(r);
  for (const rows of byState.values()) {
    out[`${statePath(rows[0])}/index.html`] = statePage(d, rows, posthog);
    for (const r of rows) if (hasData(r)) out[`${insurerPath(r)}/index.html`] = insurerPage(d, r, rows, posthog);
  }
  return out;
}
