// Copies the free engine and the sample letters into public/ so the free answer runs in the
// browser and the letter never leaves the device. lib/packet.js is deliberately NOT copied:
// the packet is built on the server after payment. Output is gitignored; edit lib/, not public/lib/.
import { mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FREE = ["engine.js", "extract.js", "dates.js", "rules.js", "letters.js"];
mkdirSync(join(root, "public/lib"), { recursive: true });
for (const f of FREE) copyFileSync(join(root, "lib", f), join(root, "public/lib", f));
mkdirSync(join(root, "public/examples"), { recursive: true });
for (const f of readdirSync(join(root, "examples"))) copyFileSync(join(root, "examples", f), join(root, "public/examples", f));
console.log(`copied ${FREE.length} engine files + examples into public/`);
