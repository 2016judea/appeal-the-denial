// Copies the free engine and the sample letters into public/ so the free answer runs in the
// browser and the letter never leaves the device. lib/packet.js is deliberately NOT copied:
// the packet is built on the server after payment. Output is gitignored; edit lib/, not public/lib/.
//
// Then builds the denial-rate pages, the data downloads, llms.txt, llms-full.txt and sitemap.xml
// from data/denial-rates-2025.json (lib/ratepages.js). Those are gitignored output too.
import { mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pagesFor, csv, llms, llmsFull, sitemap, national } from "../lib/ratepages.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FREE = ["engine.js", "extract.js", "dates.js", "rules.js", "letters.js", "share.js", "ics.js"];
mkdirSync(join(root, "public/lib"), { recursive: true });
for (const f of FREE) copyFileSync(join(root, "lib", f), join(root, "public/lib", f));
mkdirSync(join(root, "public/examples"), { recursive: true });
for (const f of readdirSync(join(root, "examples"))) copyFileSync(join(root, "examples", f), join(root, "public/examples", f));

const data = JSON.parse(readFileSync(join(root, "data/denial-rates-2025.json"), "utf8"));
const posthog = readFileSync(join(root, "lib/posthog.html"), "utf8");
writeFileSync(join(root, "public/lib/national.js"), `// Built from data/denial-rates-2025.json by scripts/build.mjs.\nexport const NATIONAL = ${JSON.stringify(national(data))};\n`);

rmSync(join(root, "public/denial-rates"), { recursive: true, force: true });
const pages = pagesFor(data, posthog);
for (const [path, html] of Object.entries(pages)) {
  mkdirSync(join(root, "public", dirname(path)), { recursive: true });
  writeFileSync(join(root, "public", path), html);
}
mkdirSync(join(root, "public/data"), { recursive: true });
writeFileSync(join(root, "public/data/denial-rates-2025.csv"), csv(data));
writeFileSync(join(root, "public/data/denial-rates-2025.json"), JSON.stringify(data));
writeFileSync(join(root, "public/llms.txt"), llms(data));
writeFileSync(join(root, "public/llms-full.txt"), llmsFull(data));
writeFileSync(join(root, "public/sitemap.xml"), sitemap(data, ["/", "/connect.html", "/privacy.html"]));

console.log(`copied ${FREE.length} engine files + examples into public/; ${Object.keys(pages).length} denial-rate pages, data files, llms.txt, llms-full.txt, sitemap.xml`);
