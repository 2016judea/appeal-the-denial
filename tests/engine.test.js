import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RULES } from "../lib/rules.js";
import { addFourMonths, addDays } from "../lib/dates.js";
import { analyze } from "../lib/engine.js";

const ex = (n) => readFileSync(new URL(`../examples/${n}.txt`, import.meta.url), "utf8");
const TODAY = "2026-11-03";
const dl = (r, kind) => r.deadlines.find((d) => d.kind === kind);

test("every rule quote is verbatim in the eCFR text it cites", () => {
  for (const [id, r] of Object.entries(RULES)) {
    const text = readFileSync(new URL(`../regs/${r.file}`, import.meta.url), "utf8");
    assert.ok(text.includes(r.quote), `${id}: quote not found in regs/${r.file}`);
    const sec = r.cite.match(/CFR ([\d.-]+)/)[1];
    assert.ok(r.file.includes(sec), `${id}: cite ${r.cite} does not match file ${r.file}`);
  }
});

test("four months follows the regulation's own example (Oct 30 -> Mar 1)", () => {
  assert.equal(addFourMonths("2026-10-30"), "2027-03-01");
  assert.equal(addFourMonths("2026-10-14"), "2027-02-14");
});

test("ERISA claim: 180 days from the letter, 60-day decision, self-funded noted", () => {
  const r = analyze(ex("erisa_mri"), {}, TODAY);
  assert.equal(r.plan.plan_type, "erisa");
  assert.equal(r.fields.self_funded, true);
  assert.equal(dl(r, "file_internal_appeal").due_date, addDays("2026-10-14", 180));
  assert.equal(dl(r, "file_internal_appeal").rule.cite, "29 CFR 2560.503-1(h)(3)(i)");
  assert.equal(dl(r, "insurer_decides").due_date, addDays(TODAY, 60));
  assert.equal(r.summary.reason_category, "medical_necessity");
  assert.match(r.appeal_letter, /NSH448812907/);
  assert.match(r.appeal_letter, /2560\.503-1\(h\)\(2\)\(iii\)/);
});

test("received date moves the ERISA clock; a pre-service urgent claim gets 72 hours", () => {
  const r = analyze(ex("erisa_mri"), { received_date: "2026-10-20", stage: "pre_service", urgent: true }, TODAY);
  assert.equal(dl(r, "file_internal_appeal").due_date, addDays("2026-10-20", 180));
  assert.equal(dl(r, "insurer_decides").rule.cite, "29 CFR 2560.503-1(i)(2)(i)");
});

test("Medicare Advantage: 60 days after presumed receipt, but the letter's earlier date wins", () => {
  const r = analyze(ex("medicare_advantage_pt"), {}, TODAY);
  assert.equal(r.plan.plan_type, "medicare_advantage");
  const d = dl(r, "file_internal_appeal");
  assert.equal(d.letter_says.date, "2026-12-21");
  assert.equal(d.due_date, "2026-12-21"); // 10/22 + 60, earlier than 10/22 + 5 + 60
  assert.ok(r.notes.some((n) => n.rule.cite === "42 CFR 422.592(a)"));
});

test("Medicare Advantage without a stated deadline uses receipt + 60", () => {
  const text = ex("medicare_advantage_pt").replace(/You must ask within 60 calendar days of the date of this notice\./, "");
  const r = analyze(text, {}, TODAY);
  assert.equal(dl(r, "file_internal_appeal").due_date, addDays("2026-10-22", 65));
});

test("Medicaid managed care: 60 days from the notice date", () => {
  const r = analyze(ex("medicaid_mco_drug"), {}, TODAY);
  assert.equal(r.plan.plan_type, "medicaid_managed");
  assert.equal(dl(r, "file_internal_appeal").due_date, "2027-01-01");
});

test("Marketplace: one internal level noted, ACA cite present", () => {
  const r = analyze(ex("marketplace_oon"), {}, TODAY);
  assert.equal(r.plan.plan_type, "aca_individual");
  assert.ok(r.notes.some((n) => n.rule.cite === "45 CFR 147.136(b)(3)(ii)(G)"));
  assert.equal(r.summary.reason_category, "out_of_network");
});

test("final denial on an ERISA plan points to external review in four months", () => {
  const r = analyze(ex("erisa_mri"), { internal_appeal_level: "final" }, TODAY);
  assert.equal(dl(r, "file_external_review").due_date, "2027-02-14");
  assert.equal(dl(r, "file_internal_appeal"), undefined);
});

test("unknown plan type shows the earliest common deadline and says so", () => {
  const r = analyze("Dear member, Date: 10/01/2026. Your claim was denied.", {}, TODAY);
  assert.equal(r.plan.plan_type, null);
  assert.equal(dl(r, "file_internal_appeal").due_date, addDays("2026-10-01", 60));
  assert.ok(r.problems.length >= 1);
});

test("no date means no deadlines are invented", () => {
  const r = analyze("Your claim was denied. ERISA plan.", {}, TODAY);
  assert.equal(r.deadlines.filter((d) => d.kind.startsWith("file_")).length, 0);
  assert.ok(r.problems.some((p) => /letter date/.test(p)));
});

test("the letter never judges medical necessity", () => {
  for (const n of ["erisa_mri", "medicare_advantage_pt", "medicaid_mco_drug", "marketplace_oon"]) {
    const r = analyze(ex(n), {}, TODAY);
    assert.doesNotMatch(r.appeal_letter, /\bis medically necessary\b|\bclearly necessary\b|\bstandard of care\b/i);
  }
});
