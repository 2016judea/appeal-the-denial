// The free draft: one internal appeal letter. Organises facts and cites rules. It never
// argues the medicine; it asks for the doctor's letter and the plan's own criteria.

import { RULES } from "./rules.js";
import { pretty } from "./dates.js";

const B = (v, blank) => (v ? String(v) : `[${blank}]`);
const ERISA_LIKE = new Set(["erisa", "gov_employer", "aca_individual"]);

const REASON_PARAS = {
  medical_necessity: (f) =>
    `The letter says this care is not medically necessary. My treating provider, ${B(f.provider_name, "doctor's name")}, ordered it for my condition. A letter from my provider explaining why I need it is enclosed, along with the relevant medical records. Please have the review done by someone who did not make the first decision, and send me the specific clinical criteria or guideline used to deny it.`,
  experimental: (f) =>
    `The letter says this care is experimental or investigational. My provider, ${B(f.provider_name, "doctor's name")}, ordered it as treatment for my condition. My provider's letter, with the published evidence and guidelines they rely on, is enclosed. Please send me the plan language and the criteria used to classify it as experimental.`,
  out_of_network: () =>
    `The letter says the provider was out of network. Enclosed is what shows why this provider was used: [no in-network provider could offer this care within a reasonable time or distance / it was an emergency / I was told the provider was in network / I did not choose the provider]. Please reprocess the claim at the in-network level.`,
  not_covered: () =>
    `The letter says this is not a covered benefit. Please identify the exact plan provision relied on. I ask that the plan review its own documents: [the section of your plan booklet that you believe covers it, if you have it].`,
  prior_auth: () =>
    `The letter says prior authorization was missing. [Authorization was requested on DATE, reference NUMBER / this was an emergency and could not wait / my provider was responsible for obtaining it]. Please review the request on its merits and process it as if authorization had been obtained.`,
  coding: () =>
    `The letter points to a coding or billing problem. My provider's office is submitting a corrected claim, or has confirmed the original coding is correct; their statement is enclosed. Please reprocess the claim.`,
  eligibility: () =>
    `The letter says my coverage was not active. My coverage was in effect on the date of service. Enclosed is proof: [ID card / premium payment / enrollment confirmation]. Please reprocess the claim.`,
  timely_filing: () =>
    `The letter says the claim was filed too late. [The claim was first submitted on DATE; proof is enclosed / the delay was caused by …]. Please accept and process the claim.`,
  duplicate: () =>
    `The letter calls this a duplicate claim. It is a separate service, not a repeat: [date and description of each service]. Please process it.`,
  other: () =>
    `I disagree with this decision. Please send me the specific reason and the plan provision relied on, and review the enclosed information.`,
};

export function appealLetter(r) {
  const f = r.fields;
  const p = r.plan.plan_type;
  const what = { reconsideration: "a reconsideration", appeal: "an appeal", "fair hearing request": "a fair hearing", redetermination: "a redetermination", "request for reconsideration": "a reconsideration", "external review": "an external review", "internal appeal": "an internal appeal" }[r.appeal_name] || "an appeal";
  const dated = f.letter_date ? pretty(f.letter_date) : "[date on the letter]";
  const lines = [
    "[Your name]",
    "[Your address]",
    "[Phone] · [Email]",
    "",
    "[Today's date]",
    "",
    `${B(f.insurer_name, "Insurer or plan name")}`,
    "[Appeals address, fax or portal from your letter]",
    "",
    `Re: Request for ${what.replace(/^an? /, "")}${f.urgent ? " (EXPEDITED: waiting could seriously jeopardize my health)" : ""}`,
    `Member: ${B(f.patient_name, "patient name")}`,
    `Member ID: ${B(f.member_id, "member ID")}${f.group_number ? ` · Group: ${f.group_number}` : ""}`,
    `Claim / reference number: ${B(f.claim_number, "claim or reference number")}`,
    `Service: ${B(f.service_denied, "service denied")}${f.service_date ? ` · Date of service: ${pretty(f.service_date)}` : ""}`,
    "",
    "To whom it may concern:",
    "",
    `I am requesting ${what} of your decision dated ${dated} denying ${B(f.service_denied, "the service")}.`,
    "",
    (REASON_PARAS[f.reason_category] || REASON_PARAS.other)(f),
  ];
  if (f.reason_text_verbatim) lines.push("", `Your letter gave this reason: "${f.reason_text_verbatim.slice(0, 400)}"`);
  if (ERISA_LIKE.has(p)) {
    lines.push("",
      `Please send me, free of charge, copies of all documents, records and other information relevant to my claim, including the plan documents and any internal guideline or criterion relied on (${RULES.erisa_documents.cite}).`,
      "", `Please consider everything enclosed, whether or not it was part of the first decision (${RULES.erisa_new_evidence.cite}).`);
  }
  if (p === "medicare_advantage") lines.push("", `If you do not fully approve this request, please forward my case to the independent review entity as required by ${RULES.ma_auto_forward_ire.cite}.`);
  lines.push("", "Enclosed:", "- A copy of your denial letter", "- A letter from my provider", "- [Medical records / other documents]",
    "", "Please send your decision in writing. Thank you.", "", "Sincerely,", "", "[Signature]", "[Your name]");
  return lines.join("\n");
}
