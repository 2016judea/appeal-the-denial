import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler from "../api/packet.js";

const letter = readFileSync(new URL("../examples/erisa_mri.txt", import.meta.url), "utf8");

function run(body, session) {
  globalThis.fetch = async () => ({ ok: !!session, json: async () => session });
  process.env.PAYMENT_LINK_ID = "plink_ours";
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o }); } };
    handler({ method: "POST", body }, res);
  });
}

test("unpaid session gets 402 and no packet", async () => {
  const r = await run({ session_id: "cs_live_abc", letter_text: letter }, { payment_status: "unpaid", payment_link: "plink_ours" });
  assert.equal(r.code, 402);
});

test("a paid session from someone else's payment link gets 402", async () => {
  const r = await run({ session_id: "cs_live_abc", letter_text: letter }, { payment_status: "paid", payment_link: "plink_other" });
  assert.equal(r.code, 402);
});

test("paid session builds every part of the packet", async () => {
  const r = await run({ session_id: "cs_live_abc", letter_text: letter }, { payment_status: "paid", payment_link: "plink_ours" });
  assert.equal(r.code, 200);
  const p = r.body;
  assert.match(p.claim_file_request, /2560\.503-1\(h\)\(2\)\(iii\)/);
  assert.match(p.lmn_request, /for the doctor to complete/);
  assert.match(p.evidence_checklist, /Letter of medical necessity/);
  assert.match(p.calendar_ics, /DTSTART;VALUE=DATE:20270412/);
  assert.ok(p.escalation.letters.external_review_request);
  assert.match(p.escalation.steps.join(" "), /askebsa\.dol\.gov/); // self-funded -> DOL, not the state
});
