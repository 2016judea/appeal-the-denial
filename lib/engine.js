// The free answer: what was denied, which rulebook applies, every deadline (computed here,
// never by a model), the next step, and a draft appeal letter.

import { RULES, PLAN_TYPES, STAGES, REASONS } from "./rules.js";
import { addDays, addFourMonths, daysBetween, todayISO, parseISO, iso } from "./dates.js";
import { extract } from "./extract.js";
import { appealLetter } from "./letters.js";

const ruleRef = (id) => ({ id, cite: RULES[id].cite, url: RULES[id].url, quote: RULES[id].quote });

function addMonthsNoLater(s, n) {
  // Calendar months; when the target month is shorter, land on its last day (the earlier
  // reading, so the date shown is never later than the rule allows).
  const d = parseISO(s), day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return iso(t);
}

const ERISA_LIKE = new Set(["erisa", "gov_employer", "aca_individual"]);

export function analyze(text, overrides = {}, today = todayISO()) {
  const f = { ...extract(text) };
  for (const [k, v] of Object.entries(overrides || {})) if (v !== undefined && v !== null && v !== "") f[k] = v;
  if (typeof f.urgent === "string") f.urgent = f.urgent === "true";
  if (typeof f.self_funded === "string") f.self_funded = f.self_funded === "true" ? true : f.self_funded === "false" ? false : null;
  if (typeof f.grandfathered === "string") f.grandfathered = f.grandfathered === "true";
  if (typeof f.two_level_appeals === "string") f.two_level_appeals = f.two_level_appeals === "true";

  const problems = [];
  if (!f.letter_date || !parseISO(f.letter_date)) problems.push("No letter date found. Add the date printed on the letter to get deadlines.");
  if (!f.plan_type) problems.push("Couldn't tell what kind of plan this is. Pick it, because it decides the deadlines. Until then the earliest possible deadline is shown.");

  const deadlines = [];
  const notes = [];
  const add = (kind, label, date, rule, extra = {}) =>
    deadlines.push({ kind, label, due_date: date, days_left: date ? daysBetween(today, date) : null, rule: ruleRef(rule), ...extra });

  const p = f.plan_type;
  const ld = f.letter_date && parseISO(f.letter_date) ? f.letter_date : null;
  const rd = f.received_date && parseISO(f.received_date) ? f.received_date : null;
  const final = f.internal_appeal_level === "final";
  let path = [], next_step = "", appeal_name = "internal appeal";

  if (ld && (ERISA_LIKE.has(p) || !p)) {
    const anchor = rd || ld;
    if (!final && p) {
      add("file_internal_appeal", "File your internal appeal by", addDays(anchor, 180), "erisa_file_internal",
        { counted_from: rd ? "the day you received the letter" : "the letter date (the rule counts from the day you received it; using the letter date keeps you safe)" });
    }
    if (final && !f.grandfathered && p) {
      add("file_external_review", "Ask for an independent external review by", addFourMonths(anchor),
        p === "erisa" && f.self_funded !== false ? "external_review_federal_erisa" : "external_review_federal_phs",
        { counted_from: rd ? "the day you received the final denial" : "the letter date (the rule counts from receipt)" });
    }
  }

  if (p === "erisa" || p === "gov_employer" || p === "aca_individual") {
    const two = p !== "aca_individual" && f.two_level_appeals === true;
    const decide = f.urgent ? RULES.erisa_decide_urgent : f.stage === "pre_service" ? RULES.erisa_decide_pre : RULES.erisa_decide_post;
    const decideId = f.urgent ? "erisa_decide_urgent" : f.stage === "pre_service" ? "erisa_decide_pre" : "erisa_decide_post";
    const decideText = decide.hours ? `${decide.hours} hours` : `${two ? decide.daysIfTwoLevels : decide.days} days`;
    path = final
      ? ["Internal appeal (done, denied)", f.grandfathered ? "Court (grandfathered plans have no external review)" : "Independent external review", "Court or your state insurance regulator"]
      : ["Internal appeal to the plan", f.grandfathered ? "Court (grandfathered plans have no external review)" : "Independent external review", "Court or your state insurance regulator"];
    if (!final) {
      add("insurer_decides", `If you file today, the plan must decide within ${decideText}, by`, decide.hours ? addDays(today, 3) : addDays(today, two ? decide.daysIfTwoLevels : decide.days), decideId);
      next_step = `Send the internal appeal below to the address on your letter. Ask your doctor for a letter explaining why you need this care. Ask the plan for your claim file (free under ${RULES.erisa_documents.cite}).`;
    } else {
      next_step = f.grandfathered
        ? "Your plan says it is grandfathered, so the federal external review rule does not apply. Your state may still offer review; check with your state insurance department."
        : "Ask for an independent external review. A reviewer outside the insurer decides, and if they side with you the plan must pay.";
      appeal_name = "external review";
    }
    if (p === "aca_individual") notes.push({ text: "Individual and Marketplace plans get one level of internal appeal, then external review.", rule: ruleRef("aca_individual_one_level") });
    if (p === "erisa" && f.self_funded === true) notes.push({ text: "Your plan looks self-funded by your employer. State insurance law mostly doesn't reach it; the federal rules here do. External review goes through the federal process or the plan's contracted reviewers.", rule: ruleRef("external_review_federal_erisa") });
    if (p !== "erisa" || f.self_funded === false) notes.push({ text: "Insured and individual plans usually use your state's external review. The state must give you at least four months.", rule: ruleRef("external_review_state_floor") });
    if (f.urgent) notes.push({ text: "Because waiting could seriously harm your health, you can ask for an expedited external review at the same time as your expedited internal appeal.", rule: ruleRef("external_review_expedited") });
    if (p === "gov_employer") notes.push({ text: "Government employer plans aren't ERISA plans, but the ACA applies the same appeal rules to them.", rule: ruleRef("aca_group_incorporates_erisa") });
    if (!final) notes.push({ text: "Send anything new. The appeal must consider it even if the first decision didn't.", rule: ruleRef("erisa_new_evidence") });
  }

  if (p === "medicare_advantage") {
    appeal_name = "reconsideration";
    path = ["Reconsideration by the plan", "Automatic review by an independent entity (if the plan says no again)", "Administrative law judge, then the Medicare Appeals Council"];
    if (ld) {
      const receipt = rd || addDays(ld, RULES.ma_receipt_presumed.days);
      add("file_internal_appeal", "Ask for a reconsideration by", addDays(receipt, RULES.ma_file_reconsideration.days), "ma_file_reconsideration",
        { counted_from: rd ? "the day you received the notice" : "5 days after the notice date, which the rule presumes is when you received it" });
    }
    const id = f.urgent ? "ma_decide_expedited" : f.part_b_drug ? "ma_decide_part_b_drug" : f.stage === "post_service" ? "ma_decide_payment" : "ma_decide_service";
    const r = RULES[id];
    add("insurer_decides", `If you file today, the plan must decide within ${r.hours ? r.hours + " hours" : r.days + " days"}, by`, addDays(today, r.hours ? 3 : r.days), id);
    notes.push({ text: "If the plan doesn't fully reverse itself, it must send your case to an independent reviewer on its own. You don't file that step.", rule: ruleRef("ma_auto_forward_ire") });
    next_step = "Send the reconsideration request below to the plan. Ask your doctor for a supporting letter; your doctor can also ask on your behalf.";
  }

  if (p === "medicaid_managed") {
    appeal_name = "appeal";
    path = ["Appeal to your Medicaid health plan", "State fair hearing", "Your state's review or court"];
    if (ld && !final) add("file_internal_appeal", "File your appeal with the plan by", addDays(ld, RULES.medicaid_mc_file_appeal.days), "medicaid_mc_file_appeal", { counted_from: "the date on the notice" });
    if (ld && final) add("file_fair_hearing", "Ask for a state fair hearing by (at least; your notice may give up to 120 days)", addDays(rd || ld, RULES.medicaid_mc_fair_hearing.days), "medicaid_mc_fair_hearing", { counted_from: "the date of the plan's appeal decision" });
    const id = f.urgent ? "medicaid_mc_decide_expedited" : "medicaid_mc_decide";
    if (!final) add("insurer_decides", `If you file today, the plan must decide within ${RULES[id].hours ? "72 hours" : "30 days"} (your state may set less), by`, addDays(today, RULES[id].hours ? 3 : 30), id);
    next_step = final ? "Ask your state for a fair hearing. The plan's decision notice says how." : "File the appeal below with your health plan. Ask your doctor for a supporting letter.";
  }

  if (p === "medicaid_ffs") {
    appeal_name = "fair hearing request";
    path = ["State fair hearing", "Your state's review or court"];
    if (ld) add("file_fair_hearing", "Ask for a state fair hearing no later than (your state may set fewer days; your notice says)", addDays(ld, RULES.medicaid_ffs_fair_hearing.days), "medicaid_ffs_fair_hearing", { counted_from: "the date the notice was mailed" });
    next_step = "Ask the state Medicaid agency for a fair hearing. Use the earlier of this date and the one printed on your notice.";
  }

  if (p === "original_medicare") {
    appeal_name = "redetermination";
    path = ["Redetermination by the Medicare contractor", "Reconsideration by a qualified independent contractor", "Administrative law judge"];
    if (ld) add("file_internal_appeal", "Ask for a redetermination by", addDays(rd || addDays(ld, 5), RULES.original_medicare_redetermination.days), "original_medicare_redetermination", { counted_from: rd ? "the day you received it" : "5 days after the notice date (presumed receipt)" });
    next_step = "Send the redetermination request below to the contractor named on your Medicare Summary Notice.";
  }

  if (p === "fehb") {
    appeal_name = "request for reconsideration";
    path = ["Reconsideration by the carrier", "Review by OPM", "Court"];
    if (ld) add("file_internal_appeal", "Ask the carrier to reconsider by", addMonthsNoLater(ld, 6), "fehb_reconsideration", { counted_from: "the date of the notice" });
    next_step = "Send the reconsideration request below to your FEHB carrier.";
  }

  if (!p && ld) {
    add("file_internal_appeal", "Earliest possible deadline until you pick your plan type", addDays(ld, 60), "medicaid_mc_file_appeal",
      { counted_from: "the letter date. The shortest window among the common plan types is 60 days (Medicaid managed care and Medicare Advantage). Pick your plan type for the real date." });
    next_step = "Tell us what kind of plan this is. The deadline depends on it.";
  }

  // The letter's own stated deadline: show it, and the earlier date wins.
  const own = f.deadline_stated_in_letter;
  const fileDl = deadlines.find((d) => d.kind.startsWith("file_"));
  if (own && ld && fileDl && own.days <= 400 && (fileDl.kind !== "file_external_review" || /external/i.test(own.text || ""))) {
    const theirs = addDays(/receiv/i.test(own.text || "") && rd ? rd : ld, own.days);
    fileDl.letter_says = { date: theirs, text: own.text };
    if (theirs < fileDl.due_date) {
      fileDl.due_date = theirs;
      fileDl.days_left = daysBetween(today, theirs);
      fileDl.label += " (your letter gives an earlier date; use it)";
    }
  }

  const result = {
    summary: {
      service_denied: f.service_denied,
      reason_category: f.reason_category,
      reason_label: REASONS[f.reason_category] || REASONS.other,
      reason_text_verbatim: f.reason_text_verbatim,
      reason_codes: f.reason_codes,
      stage: f.stage, stage_label: STAGES[f.stage],
      amount_denied: f.amount_denied,
    },
    plan: { plan_type: p, label: PLAN_TYPES[p] || "Unknown", evidence: f.plan_type_evidence, self_funded: f.self_funded, grandfathered: f.grandfathered },
    path,
    deadlines,
    next_step,
    notes,
    problems,
    fields: f,
    appeal_name,
    today,
  };
  result.appeal_letter = appealLetter(result);
  result.not_medical_advice = "This organises your letter and the rules. It doesn't judge whether your care was medically necessary; that argument comes from your doctor.";
  return result;
}
