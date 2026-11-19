// Puts lib/posthog.html (the health variant of the shared PostHog block) into every hand-written
// page in public/, before </head> or over an existing block. Idempotent. Generated pages get it
// from scripts/build.mjs. tests/pages.test.js fails when a page is missing it or carries an old copy.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const block = readFileSync(join(root, "lib/posthog.html"), "utf8").trim();
const RE = /<!-- bm-posthog:begin[\s\S]*?<!-- bm-posthog:end -->/;
for (const f of readdirSync(join(root, "public")).filter((f) => f.endsWith(".html"))) {
  const p = join(root, "public", f);
  const html = readFileSync(p, "utf8");
  const next = RE.test(html) ? html.replace(RE, () => block) : html.replace("</head>", block + "\n</head>");
  if (next !== html) { writeFileSync(p, next); console.log("analytics block ->", f); }
}
