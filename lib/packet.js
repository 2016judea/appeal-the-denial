// The paid packet: everything after the letter. Built on the server only after Stripe says
// the session is paid. The letter text passes through the request and is never stored.

import { RULES } from "./rules.js";
import { pretty, addDays } from "./dates.js";

const B = (v, blank) => (v ? String(v) : `[${blank}]`);
const ERISA_LIKE = new Set(["erisa", "gov_employer", "aca_individual"]);

export const LINKS = {
  state_regulators: "https://content.naic.org/state-insurance-departments",
  federal_external_review: "https://www.healthcare.gov/appeal-insurance-company-decision/external-review/",
  ebsa: "https://www.askebsa.dol.gov/",
  medicare_appeals: "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals",
};

const head = (f) => [
  "[Your name]", "[Your address]", "[Phone] · [Email]", "", "[Today's date]", "",
  B(f.insurer_name, "Insurer or plan name"), "[Address from your letter]", "",
];
const refs = (f) => [
  `Member: ${B(f.patient_name, "patient name")}`,
  `Member ID: ${B(f.member_id, "member ID")}${f.group_number ? ` · Group: ${f.group_number}` : ""}`,
  `Claim / reference number: ${B(f.claim_number, "claim or reference number")}`,
  `Service: ${B(f.service_denied, "service denied")}${f.service_date ? ` · Date of service: ${pretty(f.service_date)}` : ""}`,
];

function claimFileRequest(r) {
  const f = r.fields, p = r.plan.plan_type;
  const legal = ERISA_LIKE.has(p)
    ? `Under ${RULES.erisa_documents.cite}, I am entitled, on request and free of charge, to reasonable access to and copies of all documents, records and other information relevant to my claim.`
    : "Please send me a copy of my case file and the documents used to decide my claim, free of charge.";
  return [
    ...head(f), "Re: Request for my claim file and plan documents", ...refs(f), "",
    "To whom it may concern:", "",
    `I am preparing an appeal of your decision dated ${f.letter_date ? pretty(f.letter_date) : "[date]"}. ${legal}`, "",
    "Please send:",
    "1. The complete claim file, including all notes, call logs and correspondence.",
    "2. Every medical record and document you reviewed.",
    "3. The name and credentials of each person who reviewed the claim, and any medical opinion obtained.",
    "4. The internal rule, guideline, protocol or clinical criterion relied on (for example, the InterQual or MCG criterion), or a statement that none exists.",
    "5. The plan document or policy, and the summary plan description, in effect on the date of service.",
    "6. Any fee schedule or network document relied on, if the denial concerns payment or network status.",
    "",
    "Please send these to the address above. Asking for these documents does not waive any deadline, and I am filing my appeal separately.",
    "", "Sincerely,", "", "[Signature]", "[Your name]",
  ].join("\n");
}

function lmnRequest(r) {
  const f = r.fields;
  const due = r.deadlines.find((d) => d.kind.startsWith("file_"));
  return [
    `To: ${B(f.provider_name, "your doctor")}`,
    `From: ${B(f.patient_name, "patient name")}, date of birth [DOB]`,
    "",
    `Re: Letter of medical necessity for my appeal — ${B(f.service_denied, "service")}`,
    "",
    `My insurer, ${B(f.insurer_name, "insurer")}, denied ${B(f.service_denied, "this care")}. Their reason: "${(f.reason_text_verbatim || r.summary.reason_label).slice(0, 300)}"`,
    "",
    `I am appealing${due ? ` and my deadline is ${pretty(due.due_date)}` : ""}. Could you write a letter on your letterhead covering the points below? Your clinical judgment is what the reviewer weighs; I have not written any of it for you.`,
    "",
    "Letter of medical necessity — for the doctor to complete",
    "-------------------------------------------------------",
    `Patient: ${B(f.patient_name, "name")}   Member ID: ${B(f.member_id, "ID")}   Claim/ref: ${B(f.claim_number, "number")}`,
    "1. Diagnosis (with ICD-10 codes):",
    "2. Relevant history, prior treatments tried, and how they turned out:",
    "3. The care requested and why it is needed for this patient:",
    "4. Why alternatives are not appropriate for this patient:",
    "5. What is expected to happen without this care:",
    `6. Response to the insurer's stated reason ("${r.summary.reason_label}"):`,
    "7. Clinical guidelines or literature supporting the request:",
    `8. ${f.urgent ? "Why waiting the standard time could seriously jeopardize the patient's life, health or ability to regain maximum function:" : "If waiting would seriously jeopardize the patient's health, say so; that qualifies the appeal for an expedited decision."}`,
    "Signature, credentials, date, contact:",
  ].join("\n");
}

const CHECKLIST = {
  common: ["A copy of the denial letter (keep the original)", "Your appeal letter, signed and dated", "Proof of when you sent it (certified mail receipt, fax confirmation or portal screenshot)", "Your insurance card, front and back"],
  medical_necessity: ["Letter of medical necessity from your doctor", "Office notes and records for this condition", "Test results and imaging reports that led to the order", "A list of treatments already tried, with dates and results", "The insurer's clinical criterion (from your claim file request), so your doctor can answer it point by point"],
  experimental: ["Letter from your doctor", "Published studies or guidelines your doctor relies on", "Evidence that standard treatments were tried or are not suitable", "Any FDA approval or compendia listing for the drug or device"],
  out_of_network: ["Proof there was no in-network provider available in reasonable time or distance (names you called, dates, wait times)", "Proof it was an emergency, if it was", "Any statement you got that the provider was in network", "The surprise bill notice, if the provider was at an in-network facility"],
  not_covered: ["The page of your plan booklet that you believe covers this service", "Your doctor's letter describing what the service is for"],
  prior_auth: ["Any authorization number or request date", "Records showing it was an emergency, if it was", "Your doctor's letter"],
  coding: ["The provider's corrected claim or a statement that the original coding is correct", "Itemised bill"],
  eligibility: ["Premium payment records", "Enrollment confirmation", "ID card showing the coverage dates"],
  timely_filing: ["Proof of the first submission date", "Any letter explaining the delay"],
  duplicate: ["Itemised bills showing each service separately"],
  other: ["Your doctor's letter", "Any records that relate to the stated reason"],
};

function checklist(r) {
  const items = [...CHECKLIST.common, ...(CHECKLIST[r.summary.reason_category] || CHECKLIST.other)];
  return ["Evidence checklist", "", ...items.map((i) => `[ ] ${i}`), "", "Keep copies of everything you send."].join("\n");
}

function ics(r) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = [];
  for (const d of r.deadlines.filter((d) => d.kind.startsWith("file_") && d.due_date)) {
    const day = d.due_date.replace(/-/g, "");
    const next = addDays(d.due_date, 1).replace(/-/g, "");
    const uid = `${d.kind}-${day}@appeal-the-denial`;
    ev.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:DEADLINE: ${d.label.replace(/[,;]/g, " ")}`, `DESCRIPTION:${d.rule.cite}. Send it well before this date.`,
      "BEGIN:VALARM", "TRIGGER:-P14D", "ACTION:DISPLAY", "DESCRIPTION:Appeal deadline in 2 weeks", "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", "DESCRIPTION:Appeal deadline in 3 days", "END:VALARM", "END:VEVENT");
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//appeal-the-denial//EN", ...ev, "END:VCALENDAR"].join("\r\n");
}

function escalation(r) {
  const f = r.fields, p = r.plan.plan_type;
  const out = { steps: [], letters: {} };
  if (ERISA_LIKE.has(p)) {
    out.steps.push(
      `If the plan upholds the denial, ask for an independent external review within four months of receiving the final denial (${RULES.external_review_federal_phs.cite}; state processes must allow at least as long, ${RULES.external_review_state_floor.cite}). The final denial letter must say where to send it.`,
      p === "erisa" && f.self_funded === true
        ? `Your plan looks self-funded, so the U.S. Department of Labor (EBSA) handles complaints, not your state: ${LINKS.ebsa}`
        : `Complain to your state insurance department if the plan misses a deadline or ignores your request. Find yours: ${LINKS.state_regulators}`,
      `Federal external review information: ${LINKS.federal_external_review}`,
    );
    if (f.grandfathered) out.steps.unshift("Your plan says it is grandfathered, so the federal external review rule may not apply. Ask your state insurance department whether state review does.");
    out.letters.external_review_request = [
      ...head(f).slice(0, 6), "[External review address named in your final denial letter]", "",
      `Re: Request for external review${f.urgent ? " (EXPEDITED)" : ""}`, ...refs(f), "",
      "To whom it may concern:", "",
      `I request an independent external review of ${B(f.insurer_name, "the plan")}'s final internal adverse benefit determination dated [date of final denial], which upheld the denial of ${B(f.service_denied, "this service")}.`,
      "", "Enclosed are the final denial, my internal appeal, my provider's letter of medical necessity and the supporting records.",
      f.urgent ? "\nMy provider certifies that waiting the standard time would seriously jeopardize my life or health or my ability to regain maximum function." : "",
      "", "Sincerely,", "", "[Signature]", "[Your name]",
    ].join("\n");
    out.letters.regulator_complaint = [
      "[Your name, address, phone, email]", "", "[Today's date]", "",
      p === "erisa" && f.self_funded === true ? "U.S. Department of Labor, Employee Benefits Security Administration" : "[Your state insurance department — find it at " + LINKS.state_regulators + "]", "",
      `Re: Complaint about ${B(f.insurer_name, "my health plan")} — claim ${B(f.claim_number, "number")}`, "",
      `I am a member of a plan administered by ${B(f.insurer_name, "the insurer")} (member ID ${B(f.member_id, "ID")}). On ${f.letter_date ? pretty(f.letter_date) : "[date]"} it denied ${B(f.service_denied, "my claim")}. I appealed on [date].`,
      "", "[What went wrong: no decision within the required time / documents I requested were not sent / the denial did not give a specific reason / other]", "",
      "I ask that you review how my claim and appeal were handled. Copies of the denial, my appeal and the plan's responses are enclosed.",
      "", "Sincerely,", "[Your name]",
    ].join("\n");
  } else if (p === "medicare_advantage") {
    out.steps.push(
      `If the plan does not fully approve your reconsideration, it must send your case to an independent review entity on its own (${RULES.ma_auto_forward_ire.cite}). Watch for a letter from that entity.`,
      `If the independent entity also says no, the next level is an administrative law judge hearing; the entity's letter gives the deadline. Medicare's guide: ${LINKS.medicare_appeals}`,
      "You can also call 1-800-MEDICARE or your State Health Insurance Assistance Program (SHIP) for free one-on-one help.",
    );
  } else if (p === "medicaid_managed" || p === "medicaid_ffs") {
    out.steps.push(
      p === "medicaid_managed"
        ? `If the plan upholds the denial, ask for a state fair hearing. You have at least 90 days from the plan's decision (${RULES.medicaid_mc_fair_hearing.cite}); the decision notice gives your state's exact number.`
        : `Your state must give you up to 90 days from the mailing date to ask for a fair hearing (${RULES.medicaid_ffs_fair_hearing.cite}); your notice gives the exact number.`,
      "If you are getting the care now, ask about continuing benefits while you appeal; the notice explains how and by when.",
    );
    out.letters.fair_hearing_request = [
      "[Your name, address, phone]", "[Medicaid ID: " + B(f.member_id, "ID") + "]", "", "[Today's date]", "",
      "[State Medicaid agency hearings office — address on your notice]", "",
      "Re: Request for a state fair hearing", "",
      `I request a state fair hearing on the decision by ${B(f.insurer_name, "my Medicaid plan")} to deny ${B(f.service_denied, "this service")} (reference ${B(f.claim_number, "number")}).`,
      "[If you receive this care now: I ask that my benefits continue while the hearing is pending.]",
      "", "Sincerely,", "[Signature]",
    ].join("\n");
  } else {
    out.steps.push("The next level is named in your decision letter. Keep copies of everything and send before the deadline.");
  }
  return out;
}

export function buildPacket(r) {
  return {
    title: `Appeal packet — ${r.summary.service_denied || "your denial"}`,
    deadlines: r.deadlines,
    appeal_letter: r.appeal_letter,
    claim_file_request: claimFileRequest(r),
    lmn_request: lmnRequest(r),
    evidence_checklist: checklist(r),
    calendar_ics: ics(r),
    escalation: escalation(r),
    not_medical_advice: r.not_medical_advice,
  };
}
