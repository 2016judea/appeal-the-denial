// The link back from the chat: https://appeal-the-denial.vercel.app/appeal?src=mcp#<fragment>
//
// Why a URL fragment, not a server token (decided 2026-11-19):
// - A browser never sends the part after "#" to any server, so the letter's facts reach no
//   server log, no Vercel request record and no referrer. /appeal strips it with
//   history.replaceState before any analytics script loads, so PostHog and Vercel Analytics
//   only ever see /appeal?src=mcp.
// - A short-lived server token would mean storing health information, even for an hour. Both
//   directory submissions say the connector processes letters and keeps nothing; a token would
//   make that false and add a store to secure and expire.
// - The chat that receives the link already holds the whole letter, so the fragment adds no
//   new copy anywhere the person didn't already put it.
//
// The fragment carries the fields the engine read from the letter (not the letter itself),
// so it stays short enough for an assistant to repeat, and /appeal re-runs the same engine:
// analyze("", fromFragment(x)) gives the same deadlines and the same letter as the chat got.
// tests/share.test.js holds that equality for every example letter.

const KEYS = {
  letter_date: "ld", received_date: "rd", service_date: "sd", insurer_name: "in", patient_name: "pn",
  provider_name: "pv", member_id: "mi", claim_number: "cn", group_number: "gn", service_denied: "sv",
  stage: "st", urgent: "ug", reason_category: "rc", reason_text_verbatim: "rt", internal_appeal_level: "lv",
  plan_type: "pt", self_funded: "sf", grandfathered: "gf", two_level_appeals: "tl", part_b_drug: "pb",
  appeal_to: "at", amount_denied: "ad",
};
const BACK = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [v, k]));
const MAX = { reason_text_verbatim: 400, appeal_to: 240, service_denied: 140 }; // what the letter and page use
const BOOL = new Set(["urgent", "self_funded", "grandfathered", "two_level_appeals", "part_b_drug"]);
// What lib/extract.js returns for an empty letter. A field equal to it is left out of the link,
// and analyze("", fields) puts it back, so the answer is the same and the link is shorter.
const DEFAULTS = { urgent: false, part_b_drug: false, internal_appeal_level: "initial", stage: "post_service", reason_category: "other" };

// Readable text, not base64: an assistant repeats words more faithfully than an opaque string,
// and a mistyped character spoils one field instead of the whole link. Only & = + % # are escaped
// beyond what a fragment needs.
const enc = (v) => encodeURIComponent(String(v)).replace(/%20/g, "+").replace(/%2C/gi, ",").replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%40/gi, "@").replace(/%24/gi, "$");
const dec = (v) => decodeURIComponent(String(v).replace(/\+/g, " "));

export function toFragment(fields) {
  const parts = ["v=1"];
  for (const [k, short] of Object.entries(KEYS)) {
    let v = fields[k];
    if (v === undefined || v === null || v === "" || DEFAULTS[k] === v) continue;
    if (BOOL.has(k)) v = v ? 1 : 0;
    else if (typeof v === "string" && MAX[k]) v = v.slice(0, MAX[k]);
    parts.push(`${short}=${enc(v)}`);
  }
  const own = fields.deadline_stated_in_letter; // the letter's own "within N days": the earlier date wins
  if (own && own.days) parts.push(`dl=${enc(own.days)}`, `dt=${enc(own.text || "")}`);
  return parts.join("&");
}

// Returns the fields, or null when the fragment is missing or not ours. A link cut short still
// gives whatever fields arrived whole; the page says what is missing.
export function fromFragment(frag) {
  const s = String(frag || "").replace(/^#/, "");
  const kv = {};
  try {
    for (const part of s.split("&")) {
      const i = part.indexOf("=");
      if (i > 0) kv[part.slice(0, i)] = dec(part.slice(i + 1));
    }
  } catch {
    return null;
  }
  if (kv.v !== "1") return null;
  const f = {};
  for (const [short, v] of Object.entries(kv)) {
    const k = BACK[short];
    if (!k) continue;
    f[k] = BOOL.has(k) ? v === "1" : k === "amount_denied" ? Number(v) : v;
  }
  if (kv.dl && /^\d{1,3}$/.test(kv.dl)) f.deadline_stated_in_letter = { days: +kv.dl, text: kv.dt || "" };
  return f;
}
