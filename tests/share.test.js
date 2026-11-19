import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { analyze } from "../lib/engine.js";
import { toFragment, fromFragment } from "../lib/share.js";
import { appealTo } from "../lib/extract.js";

const dir = new URL("../examples/", import.meta.url);
const TODAY = "2026-11-19";

// The link from the chat must open the same answer the chat gave: same deadlines, same letter.
test("the /appeal link reproduces the chat's deadlines and letter for every example", () => {
  for (const f of readdirSync(dir)) {
    const a = analyze(readFileSync(new URL(f, dir), "utf8"), {}, TODAY);
    const frag = toFragment(a.fields);
    const b = analyze("", fromFragment(frag), TODAY);
    assert.deepEqual(b.deadlines, a.deadlines, f);
    assert.equal(b.appeal_letter, a.appeal_letter, f);
    assert.deepEqual(b.notes, a.notes, f);
    assert.deepEqual(b.path, a.path, f);
    assert.ok(frag.length < 900, `${f}: fragment ${frag.length} chars`);
    assert.ok(!/[()'*!\s]/.test(frag) && frag.endsWith("&end"), `${f}: link would break inside markdown or lose a trailing character`);
  }
});

test("person's corrections ride along: fully insured (false) and received date survive", () => {
  const letter = readFileSync(new URL("erisa_mri.txt", dir), "utf8");
  const a = analyze(letter, { self_funded: false, received_date: "2026-10-20", urgent: true }, TODAY);
  const b = analyze("", fromFragment(toFragment(a.fields)), TODAY);
  assert.deepEqual(b.deadlines, a.deadlines);
  assert.deepEqual(b.notes, a.notes);
});

test("a missing, foreign or mangled fragment gives null or only whole fields, never a throw", () => {
  assert.equal(fromFragment(""), null);
  assert.equal(fromFragment("#section-2"), null);
  assert.equal(fromFragment("v=2&pt=erisa"), null);
  assert.deepEqual(fromFragment("v=1&pt=erisa&ld=2026-10-14&zz=1"), { plan_type: "erisa", letter_date: "2026-10-14" });
  assert.equal(fromFragment("v=1&rt=%E0%A4%A"), null); // a cut-off percent escape
});

test("where to send: verbatim from the letter, or nothing", () => {
  assert.equal(appealTo(readFileSync(new URL("erisa_mri.txt", dir), "utf8")), "Northstar Appeals, PO Box 4412, Minneapolis, MN 55440. Fax 1-800-555-0144.");
  assert.equal(appealTo("Mail your appeal to:\nAppeals Department\nAcme Health\nPO Box 1234\nDallas, TX 75201\n\nCall us"), "Appeals Department, Acme Health, PO Box 1234, Dallas, TX 75201");
  assert.equal(appealTo("Appeals address: Medica Appeals, Route 0501, PO Box 9310, Minneapolis MN 55440"), "Medica Appeals, Route 0501, PO Box 9310, Minneapolis MN 55440");
  assert.equal(appealTo("We will send you a letter to let you know our decision."), null);
  assert.equal(appealTo("Please send us any records."), null);
  const r = analyze(readFileSync(new URL("erisa_mri.txt", dir), "utf8"), {}, TODAY);
  assert.match(r.appeal_letter, /Northstar Appeals, PO Box 4412/);
});
