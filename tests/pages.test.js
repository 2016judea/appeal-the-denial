import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
execFileSync("node", [join(root, "scripts/build.mjs")]);
const block = readFileSync(join(root, "lib/posthog.html"), "utf8").trim();
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "lib" || f === "examples" || f === "demo" ? [] : walk(p)) : p.endsWith(".html") ? [p] : []; });
const pages = walk(join(root, "public"));

// People paste insurance letters on these pages. The health variant of the PostHog block keeps
// autocapture and session replay off; a plain shared block would record what is on the screen.
test("every page has Vercel Analytics and the health PostHog block, current", () => {
  assert.ok(pages.length > 150, `${pages.length} pages`);
  for (const p of pages) {
    const html = readFileSync(p, "utf8");
    assert.ok(html.includes("/_vercel/insights/script.js"), `${p}: no Vercel Analytics`);
    assert.ok(html.includes(block), `${p}: PostHog block missing or stale (node scripts/inject_analytics.mjs)`);
  }
  for (const opt of ["autocapture:false", "disable_session_recording:true", "mask_all_text:true", "rageclick:false"]) assert.ok(block.includes(opt), `block lacks ${opt}`);
});

test("/appeal clears the fragment before any analytics script loads", () => {
  const html = readFileSync(join(root, "public/appeal.html"), "utf8");
  const strip = html.indexOf("history.replaceState");
  assert.ok(strip > 0 && strip < html.indexOf("/_vercel/insights/script.js") && strip < html.indexOf("bm-posthog:begin"));
});

test("rate pages print CMS's counts and our percentages agree with them", () => {
  const d = JSON.parse(readFileSync(join(root, "data/denial-rates-2025.json"), "utf8"));
  for (const r of d.rows) for (const k of ["claims_in_network", "prior_auth", "internal_appeals_claims"]) {
    const x = r[k];
    if (x.pct != null) assert.equal(x.pct, Math.floor((2 * x.k * 1000 + x.n) / (2 * x.n)) / 10, `${r.state} ${r.insurer} ${k}`); // half up, exact
  }
  const tx = d.rows.find((r) => r.state === "TX" && /Blue Cross Blue Shield of Texas/.test(r.insurer));
  const html = readFileSync(join(root, `public/denial-rates/texas/${tx.slug}/index.html`), "utf8");
  assert.ok(html.includes(`${tx.claims_in_network.pct.toFixed(1)}%`));
  assert.ok(html.includes(tx.claims_in_network.k.toLocaleString("en-US")));
  assert.match(html, /Transparency in Coverage/);
  const sm = readFileSync(join(root, "public/sitemap.xml"), "utf8");
  assert.ok(sm.includes("/denial-rates/texas/") && !/vercel\.app\/appeal[<?]/.test(sm));
});
