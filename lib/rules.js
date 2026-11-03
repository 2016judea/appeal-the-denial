// Every deadline and every appeal-path rule this tool states, with the regulation it comes
// from. `quote` is copied verbatim from the in-force eCFR text in regs/ (fetched by
// scripts/fetch_regs.py); tests/rules.test.js fails if a quote is not found there, so a rule
// cannot drift from the law without the suite going red.

const ecfr = (title, section, para = "") =>
  `https://www.ecfr.gov/current/title-${title}/section-${section}${para ? `#p-${section}${para}` : ""}`;

export const RULES = {
  erisa_file_internal: {
    cite: "29 CFR 2560.503-1(h)(3)(i)",
    url: ecfr(29, "2560.503-1", "(h)(3)(i)"),
    file: "29cfr2560.503-1.txt",
    quote: "Provide claimants at least 180 days following receipt of a notification of an adverse benefit determination within which to appeal the determination",
  },
  erisa_documents: {
    cite: "29 CFR 2560.503-1(h)(2)(iii)",
    url: ecfr(29, "2560.503-1", "(h)(2)(iii)"),
    file: "29cfr2560.503-1.txt",
    quote: "Provide that a claimant shall be provided, upon request and free of charge, reasonable access to, and copies of, all documents, records, and other information relevant to the claimant's claim for benefits",
  },
  erisa_new_evidence: {
    cite: "29 CFR 2560.503-1(h)(2)(iv)",
    url: ecfr(29, "2560.503-1", "(h)(2)(iv)"),
    file: "29cfr2560.503-1.txt",
    quote: "Provide for a review that takes into account all comments, documents, records, and other information submitted by the claimant relating to the claim, without regard to whether such information was submitted or considered in the initial benefit determination",
  },
  erisa_decide_urgent: {
    cite: "29 CFR 2560.503-1(i)(2)(i)",
    url: ecfr(29, "2560.503-1", "(i)(2)(i)"),
    file: "29cfr2560.503-1.txt",
    quote: "but not later than 72 hours after receipt of the claimant's request for review of an adverse benefit determination by the plan",
    hours: 72,
  },
  erisa_decide_pre: {
    cite: "29 CFR 2560.503-1(i)(2)(ii)",
    url: ecfr(29, "2560.503-1", "(i)(2)(ii)"),
    file: "29cfr2560.503-1.txt",
    quote: "In the case of a group health plan that provides for one appeal of an adverse benefit determination, such notification shall be provided not later than 30 days after receipt by the plan of the claimant's request for review of an adverse benefit determination",
    days: 30, daysIfTwoLevels: 15,
  },
  erisa_decide_post: {
    cite: "29 CFR 2560.503-1(i)(2)(iii)(A)",
    url: ecfr(29, "2560.503-1", "(i)(2)(iii)(A)"),
    file: "29cfr2560.503-1.txt",
    quote: "In the case of a group health plan that provides for one appeal of an adverse benefit determination, such notification shall be provided not later than 60 days after receipt by the plan of the claimant's request for review of an adverse benefit determination",
    days: 60, daysIfTwoLevels: 30,
  },
  external_review_federal_erisa: {
    cite: "29 CFR 2590.715-2719(d)(2)(i)",
    url: ecfr(29, "2590.715-2719", "(d)(2)(i)"),
    file: "29cfr2590.715-2719.txt",
    quote: "within four months after the date of receipt of a notice of an adverse benefit determination or final internal adverse benefit determination",
  },
  external_review_expedited: {
    cite: "29 CFR 2590.715-2719(d)(3)(i)(A)",
    url: ecfr(29, "2590.715-2719", "(d)(3)(i)(A)"),
    file: "29cfr2590.715-2719.txt",
    quote: "would seriously jeopardize the life or health of the claimant or would jeopardize the claimant's ability to regain maximum function and the claimant has filed a request for an expedited internal appeal",
  },
  external_review_state_floor: {
    cite: "45 CFR 147.136(c)(2)(vi)",
    url: ecfr(45, "147.136", "(c)(2)(vi)"),
    file: "45cfr147.136.txt",
    quote: "The State process must allow at least four months after the receipt of a notice of an adverse benefit determination or final internal adverse benefit determination for a request for an external review to be filed",
  },
  external_review_federal_phs: {
    cite: "45 CFR 147.136(d)(2)(i)",
    url: ecfr(45, "147.136", "(d)(2)(i)"),
    file: "45cfr147.136.txt",
    quote: "within four months after the date of receipt of a notice of an adverse benefit determination or final internal adverse benefit determination",
  },
  grandfathered: {
    cite: "29 CFR 2590.715-2719(a)(2)(ii)",
    url: ecfr(29, "2590.715-2719"),
    file: "29cfr2590.715-2719.txt",
    quote: "The provisions of this section generally do not apply to coverage offered by health insurance issuers and group health plans that are grandfathered health plans",
  },
  aca_group_incorporates_erisa: {
    cite: "45 CFR 147.136(b)(2)",
    url: ecfr(45, "147.136", "(b)(2)"),
    file: "45cfr147.136.txt",
    quote: "A group health plan and a health insurance issuer offering group health insurance coverage must comply with all the requirements of this paragraph (b)(2)",
  },
  aca_individual_incorporates_erisa: {
    cite: "45 CFR 147.136(b)(3)(i)",
    url: ecfr(45, "147.136", "(b)(3)(i)"),
    file: "45cfr147.136.txt",
    quote: "the issuer is subject to the requirements in 29 CFR 2560.503-1 as if the issuer were a group health plan",
  },
  aca_individual_one_level: {
    cite: "45 CFR 147.136(b)(3)(ii)(G)",
    url: ecfr(45, "147.136", "(b)(3)(ii)(G)"),
    file: "45cfr147.136.txt",
    quote: "a health insurance issuer offering individual health insurance coverage must provide for only one level of internal appeal before issuing a final determination",
  },
  aca_individual_urgent_doctor_decides: {
    cite: "45 CFR 147.136(b)(3)(ii)(B)",
    url: ecfr(45, "147.136", "(b)(3)(ii)(B)"),
    file: "45cfr147.136.txt",
    quote: "as determined by the attending provider, and the issuer shall defer to such determination of the attending provider",
  },
  ma_file_reconsideration: {
    cite: "42 CFR 422.582(b)",
    url: ecfr(42, "422.582", "(b)"),
    file: "42cfr422.582.txt",
    quote: "a request for reconsideration must be filed within 60 calendar days after receipt of the written organization determination notice",
    days: 60,
  },
  ma_receipt_presumed: {
    cite: "42 CFR 422.582(b)(1)",
    url: ecfr(42, "422.582", "(b)(1)"),
    file: "42cfr422.582.txt",
    quote: "The date of receipt of the organization determination is presumed to be 5 calendar days after the date of the written organization determination, unless there is evidence to the contrary",
    days: 5,
  },
  ma_decide_service: {
    cite: "42 CFR 422.590(a)",
    url: ecfr(42, "422.590", "(a)"),
    file: "42cfr422.590.txt",
    quote: "but no later than 30 calendar days from the date it receives the request for a standard reconsider",
    days: 30,
  },
  ma_decide_payment: {
    cite: "42 CFR 422.590(b)",
    url: ecfr(42, "422.590", "(b)"),
    file: "42cfr422.590.txt",
    quote: "no later than 60 calendar days from the date it receives the request for a standard reconsider",
    days: 60,
  },
  ma_decide_part_b_drug: {
    cite: "42 CFR 422.590(c)",
    url: ecfr(42, "422.590", "(c)"),
    file: "42cfr422.590.txt",
    quote: "but no later than 7 calendar days from the date it receives the request for a standard reconsidera",
    days: 7,
  },
  ma_decide_expedited: {
    cite: "42 CFR 422.590(e)(1)",
    url: ecfr(42, "422.590", "(e)(1)"),
    file: "42cfr422.590.txt",
    quote: "as expeditiously as the enrollee's health condition requires but no later than 72 hours after receiving the request",
    hours: 72,
  },
  ma_auto_forward_ire: {
    cite: "42 CFR 422.592(a)",
    url: ecfr(42, "422.592", "(a)"),
    file: "42cfr422.592.txt",
    quote: "the issues that remain in dispute must be reviewed and resolved by an independent, outside entity that contracts with CMS",
  },
  medicaid_mc_file_appeal: {
    cite: "42 CFR 438.402(c)(2)(ii)",
    url: ecfr(42, "438.402", "(c)(2)(ii)"),
    file: "42cfr438.402.txt",
    quote: "an enrollee has 60 calendar days from the date on the adverse benefit determination notice in which to file a request for an appeal to the managed care plan",
    days: 60,
  },
  medicaid_mc_decide: {
    cite: "42 CFR 438.408(b)(2)",
    url: ecfr(42, "438.408", "(b)(2)"),
    file: "42cfr438.408.txt",
    quote: "the State must establish a timeframe that is no longer than 30 calendar days from the day the MCO, PIHP, or PAHP receives the appeal",
    days: 30,
  },
  medicaid_mc_decide_expedited: {
    cite: "42 CFR 438.408(b)(3)",
    url: ecfr(42, "438.408", "(b)(3)"),
    file: "42cfr438.408.txt",
    quote: "the State must establish a timeframe that is no longer than 72 hours after the MCO, PIHP, or PAHP receives the appeal",
    hours: 72,
  },
  medicaid_mc_fair_hearing: {
    cite: "42 CFR 438.408(f)(2)",
    url: ecfr(42, "438.408", "(f)(2)"),
    file: "42cfr438.408.txt",
    quote: "The enrollee must have no less than 90 calendar days and no more than 120 calendar days from the date of the MCO's, PIHP's, or PAHP's notice of resolution to request a State fair hearing",
    days: 90,
  },
  medicaid_ffs_fair_hearing: {
    cite: "42 CFR 431.221(d)",
    url: ecfr(42, "431.221", "(d)"),
    file: "42cfr431.221.txt",
    quote: "The agency must allow the applicant or beneficiary a reasonable time, not to exceed 90 days from the date that notice of action is mailed, to request a hearings",
    days: 90,
  },
  original_medicare_redetermination: {
    cite: "42 CFR 405.942(a)",
    url: ecfr(42, "405.942", "(a)"),
    file: "42cfr405.942.txt",
    quote: "within 120 calendar days from the date a party receives the notice of the initial determination",
    days: 120, presumedReceiptDays: 5,
  },
  fehb_reconsideration: {
    cite: "5 CFR 890.105(b)(1)",
    url: ecfr(5, "890.105", "(b)(1)"),
    file: "5cfr890.105.txt",
    quote: "The covered individual has 6 months from the date of the notice to the covered individual that a claim (or a portion of a claim) was denied by the carrier in which to submit a written request for reconsideration to the carrier",
  },
};

export const PLAN_TYPES = {
  erisa: "Employer plan (private employer, covered by ERISA)",
  gov_employer: "Government employer plan (state, county, city or school district)",
  aca_individual: "Individual or Marketplace (ACA) plan",
  medicare_advantage: "Medicare Advantage plan",
  medicaid_managed: "Medicaid managed care plan",
  medicaid_ffs: "Medicaid (state agency, no managed care plan)",
  original_medicare: "Original Medicare",
  fehb: "Federal employee plan (FEHB)",
};

export const STAGES = {
  pre_service: "before care (prior authorization)",
  post_service: "after care (a claim)",
  concurrent: "ongoing care being cut short",
};

export const REASONS = {
  medical_necessity: "Not medically necessary",
  experimental: "Experimental or investigational",
  out_of_network: "Out of network",
  not_covered: "Not a covered benefit (excluded)",
  prior_auth: "No prior authorization",
  coding: "Coding or billing error",
  eligibility: "Not eligible / coverage not active",
  timely_filing: "Filed too late (timely filing)",
  duplicate: "Duplicate claim",
  other: "Other / not stated clearly",
};
