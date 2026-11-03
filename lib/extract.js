// Read a denial letter with plain rules, no model. Every field carries the words that
// set it (`evidence`) so the person can check it, and any field can be overridden by the
// person or by the AI host that called the connector.

import { findDates } from "./dates.js";

const has = (t, re) => re.test(t);
const first = (t, re) => { const m = re.exec(t); return m ? m[1].trim() : null; };
function quoteAround(t, re, width = 90) {
  const m = re.exec(t);
  if (!m) return null;
  const s = Math.max(0, m.index - 20), e = Math.min(t.length, m.index + Math.min(m[0].length, 60) + width);
  return t.slice(s, e).replace(/\s+/g, " ").trim();
}

const PLAN_SIGNS = [
  ["fehb", /\bFEHB\b|Federal Employees Health Benefits|Office of Personnel Management|\bOPM\b/i],
  ["original_medicare", /Medicare Summary Notice|\bredetermination\b(?![\s\S]{0,400}Advantage)/i],
  ["medicare_advantage", /Medicare Advantage|Notice of Denial of (?:Medical Coverage|Payment)|CMS-10003|Medicare health plan|\bPart C\b|request (?:a |for )?reconsideration[\s\S]{0,200}Medicare/i],
  ["medicaid_managed", /(?:Medicaid|Medical Assistance|Medi-Cal|MassHealth|MinnesotaCare|Apple Health|SoonerCare|TennCare|BadgerCare|CHIP)[\s\S]{0,1500}(?:health plan|managed care|appeal (?:with|to) (?:us|the plan))|(?:health plan|managed care)[\s\S]{0,1500}(?:Medicaid|Medical Assistance|Medi-Cal|MassHealth)/i],
  ["medicaid_ffs", /Medicaid|Medical Assistance|Medi-Cal|MassHealth|state fair hearing|Department of Human Services/i],
  ["aca_individual", /Marketplace|HealthCare\.gov|Covered California|MNsure|individual (?:health )?(?:plan|policy|coverage)|metal level|exchange plan/i],
  ["gov_employer", /non-federal governmental|governmental plan|state employee|public employee|school district|county employee|city employee|teachers'? (?:retirement|health)/i],
  ["erisa", /\bERISA\b|Section 502\(a\)|Employee Retirement Income Security Act|group health plan|plan administrator|your employer|self[- ]funded|self[- ]insured|employer[- ]sponsored|civil action under/i],
];

export function classifyPlan(t) {
  for (const [type, re] of PLAN_SIGNS) if (has(t, re)) return { plan_type: type, evidence: quoteAround(t, re, 60) };
  return { plan_type: null, evidence: null };
}

const REASON_SIGNS = [
  ["experimental", /experimental|investigational|unproven/i],
  ["medical_necessity", /not medically necessary|medical necessity|does not meet (?:our |the )?(?:clinical )?criteria|not meet medical|clinical (?:policy|criteria)|InterQual|MCG guideline/i],
  ["prior_auth", /prior authori[sz]ation|pre-?authori[sz]ation|pre-?certification|was not authori[sz]ed|no authori[sz]ation/i],
  ["out_of_network", /out[- ]of[- ]network|non-?participating|not in (?:our|the) network|non-?network provider/i],
  ["timely_filing", /timely filing|filing (?:limit|deadline)|received after the/i],
  ["duplicate", /duplicate (?:claim|service|submission)/i],
  ["eligibility", /not eligible|coverage (?:was )?(?:not active|terminated|ended)|no active coverage|eligibility/i],
  ["coding", /(?:invalid|incorrect|missing) (?:code|modifier|diagnosis)|coding|billed incorrectly|inconsistent with the (?:procedure|modifier)|bundled/i],
  ["not_covered", /not a covered (?:benefit|service)|excluded|exclusion|not covered under|non-covered|is not covered/i],
];

export function classifyReason(t) {
  for (const [r, re] of REASON_SIGNS) if (has(t, re)) return { reason_category: r, evidence: quoteAround(t, re, 140) };
  return { reason_category: "other", evidence: null };
}

export function classifyStage(t) {
  if (has(t, /(?:reduce|terminat|end|stop)\w* (?:your )?(?:ongoing|continued|current) (?:care|stay|treatment|services)|concurrent review|continued stay/i)) return "concurrent";
  if (has(t, /prior authori[sz]ation|pre-?authori[sz]ation|pre-?service|request(?:ed)? (?:for )?(?:coverage|approval)|before (?:you|the) (?:receive|service)|Notice of Denial of Medical Coverage|we (?:can(?:not|'t)|will not) (?:approve|authori[sz]e|cover) the (?:request|service)/i)) return "pre_service";
  return "post_service";
}

function nearLabel(t, label) {
  const re = new RegExp(`(?:${label})\\s*(?:#|number|no\\.?|ID)?\\s*[:#]?\\s*([A-Z0-9][A-Z0-9-]{3,})`, "i");
  return first(t, re);
}

function money(t, label) {
  const re = new RegExp(`(?:${label})[^$\\n]{0,40}\\$\\s?([\\d,]+(?:\\.\\d{2})?)`, "i");
  const v = first(t, re);
  return v ? Number(v.replace(/,/g, "")) : null;
}

export function extract(text) {
  const t = String(text || "");
  const dates = findDates(t);
  const labelledDate = (label) => {
    const re = new RegExp(`(?:${label})[^\\n]{0,25}?`, "i");
    const m = re.exec(t);
    if (!m) return null;
    const d = dates.find((x) => x.index >= m.index && x.index - m.index < 60);
    return d ? d.iso : null;
  };
  const letter_date =
    labelledDate("date of (?:this )?(?:letter|notice)|notice date|letter date|^date|\\bdate:") ||
    (dates.length ? dates[0].iso : null);
  const service_date = labelledDate("date(?:s)? of service|service date|DOS");

  const plan = classifyPlan(t);
  const reason = classifyReason(t);

  const stated = /(?:within|no later than|have)\s+(\d{1,3})\s+(calendar\s+)?days/i.exec(t);
  const deadline_stated_in_letter = stated ? { days: +stated[1], text: quoteAround(t, /(?:within|no later than|have)\s+\d{1,3}\s+(?:calendar\s+)?days/i, 80) } : null;

  const firstLine = (t.split(/\n/).find((l) => l.trim()) || "").trim();
  const insurer = first(t, /^\s*([A-Z][A-Za-z&.,' -]{2,60}(?:Health|Insurance|Healthcare|Care|Plan|Blue Shield|Blue Cross|Medica|Aetna|Cigna|Humana|UnitedHealthcare)[A-Za-z&.,' -]{0,30})\s*$/m);
  const service = first(t, /^\s*(?:service|item|procedure|treatment|medication|drug)(?: requested| denied| billed)?\s*:\s*([^\n]{3,140})/im)
    || first(t, /(?:request for coverage for|coverage for|payment for|approve the request for|approve)\s*:?\s*(?:the (?:drug|medication|service)\s+)?([^\n.]{3,120})/i)
    || first(t, /(?:denied|deny|denying)\s+(?:your\s+)?(?:request for\s+|the claim for\s+|payment for\s+)([^\n.]{3,120})/i);
  const reason_verbatim = first(t, /(?:reason(?: for (?:the |this )?denial)?|why we denied[^:\n]*|explanation)\s*:\s*([^\n]{10,600})/i) || reason.evidence;
  const codes = [...new Set((t.match(/\b(?:CARC|RARC|CO|PR|OA|PI|N|M|MA)[- ]?\d{1,3}\b/g) || []).filter((c) => /\d/.test(c)))].slice(0, 6);

  return {
    letter_date,
    service_date,
    insurer_name: insurer || (firstLine.length <= 70 && !/^(?:date|notice|dear|re:)/i.test(firstLine) ? firstLine : null),
    patient_name: first(t, /(?:patient|member|enrollee)(?: name)?\s*:\s*([A-Z][A-Za-z.' -]{2,60})/i),
    provider_name: first(t, /(?:provider|physician|doctor|facility|requesting provider)(?: name)?\s*:\s*([^\n]{3,80})/i),
    member_id: nearLabel(t, "member ID|member number|subscriber ID|ID number|member #|Medicaid ID|Medicare number"),
    claim_number: nearLabel(t, "claim|reference|case|authorization|request"),
    group_number: nearLabel(t, "group"),
    amount_billed: money(t, "billed|charged|total charges"),
    amount_denied: money(t, "denied|not paid|your responsibility|you owe|patient responsibility"),
    service_denied: service,
    stage: classifyStage(t),
    urgent: false, // letters always offer a fast appeal; only the person or their doctor can say it is urgent
    reason_category: reason.reason_category,
    reason_text_verbatim: reason_verbatim,
    reason_codes: codes,
    internal_appeal_level: has(t, /final (?:internal )?(?:adverse )?(?:benefit )?determination|second[- ]level|level (?:2|II) appeal|upheld (?:our|the) (?:original )?decision|appeal (?:was|has been) denied/i) ? "final" : "initial",
    plan_type: plan.plan_type,
    plan_type_evidence: plan.evidence,
    self_funded: has(t, /self[- ]funded|self[- ]insured|administrative services only|\bASO\b|claims administrator for your employer|third[- ]party administrator/i) ? true : (has(t, /fully insured|insured by/i) ? false : null),
    grandfathered: has(t, /grandfathered/i) ? true : null,
    part_b_drug: has(t, /Part B drug/i),
    deadline_stated_in_letter,
    state: null, // the first ZIP in a letter is usually the insurer's, so the person sets this
  };
}
