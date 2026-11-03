# Data model — Appeal the Denial

Written 2026-11-03 from the need alone, before any regulation, sample letter or
competitor was opened (BUSINESS.md rule 5). The buyer's sentence: *"Paste your
denial, get the appeal and the deadlines."*

The person holds one thing: a letter (an EOB or an adverse benefit determination).
Everything below is what they need to act on it, and the question each field answers.

## Entities

### Letter (what they paste; never stored unless they opt into tracking)
| field | question it answers |
|---|---|
| `text` | what does the letter actually say? |
| `letter_date` | when did the clock start? |
| `received_date` (optional, theirs) | the rules count from receipt for ERISA; did it arrive late? |
| `insurer_name` | who do I write to? |
| `member_id`, `claim_number`, `group_number` | what do I put on the appeal so it's matched? |
| `patient_name`, `provider_name`, `service_date` | which claim is this? |
| `amount_billed`, `amount_denied` | how much is at stake? |

### Denial (extracted from the letter)
| field | question it answers |
|---|---|
| `service_denied` | what did they refuse to pay for? |
| `stage` | pre-service (prior auth), post-service (claim), or concurrent care? decides the decision clock |
| `urgent` | is my health at risk if I wait? decides expedited path |
| `reason_category` | one of: medical necessity, experimental/investigational, out-of-network, not a covered benefit, prior auth missing, coding/billing error, eligibility, timely filing, duplicate | which argument and which evidence fit? |
| `reason_codes` | CARC/RARC or the insurer's own code, verbatim — what exactly did they say? |
| `reason_text_verbatim` | the sentence I must answer, word for word |
| `internal_appeal_level` | first level, second level, or final? |
| `appeal_instructions_in_letter` | address / fax / portal the letter itself names |
| `deadline_stated_in_letter` | what did the insurer say the deadline is? (shown beside ours; the earlier one wins) |

### Plan (decides the path)
| field | question it answers |
|---|---|
| `plan_type` | ERISA employer (fully insured or self-funded), non-federal government employer, ACA individual/marketplace, Medicare Advantage, Medicaid managed care, Medicaid fee-for-service | which rulebook applies? |
| `plan_type_evidence` | which words in the letter led there, so the person can check it |
| `grandfathered` | pre-2010 plan with no ACA external review? |
| `self_funded` | does state law (and the state insurance department) apply, or only federal ERISA? |
| `state` | which state's insurance department / external review process? |

### Rule (the law; static table in code, every row cited)
| field | question it answers |
|---|---|
| `plan_type`, `stage`, `urgent`, `level` | when does this rule apply? |
| `file_within_days`, `day_kind` (calendar), `anchor` (letter date or receipt) | how long do I have? |
| `decide_within` (hours/days) | how long do they have? |
| `next_level` | what comes after if they say no again? |
| `citation`, `citation_url`, `quote` | where does it say so? |

### Deadline (computed in code, never by the model)
| field | question it answers |
|---|---|
| `kind` | file internal appeal / insurer must decide / file external review / state fair hearing |
| `due_date` | the date on the calendar |
| `days_left` | how urgent is today? |
| `rule` | back-reference to the Rule row and its citation |

### Packet (the paid part — everything after the letter)
| field | question it answers |
|---|---|
| `appeal_letter` | what do I send? (free version too) |
| `claim_file_request` | request for the claim file and plan documents (ERISA relevant-documents right) |
| `lmn_request` | the letter of medical necessity my own doctor fills in (the clinical argument is theirs, never ours) |
| `evidence_checklist` | what do I attach, per reason category? |
| `tracking` | reminders before each deadline (opt-in; only then is anything stored) |
| `escalation` | external review request + state insurance department complaint when the internal appeal fails |

## Joins

Letter → Denial (1:1, extraction) → Plan (1:1, classification) →
Rule (many, by plan_type × stage × urgent × level) → Deadline (computed, 1 per Rule) →
Packet (1, assembled from all of the above).

## Rules on the model itself

- A number (a day count, a date) comes only from the Rule table and date arithmetic.
  The model extracts and drafts; it never produces a deadline.
- No field anywhere judges whether the care was medically necessary.
- Letter text lives only in the request unless the person opts into tracking.

## Reality check (filled in after the model was written)

See the bottom of this file once checked.

### Checked 2026-11-03

| entity | filled by | gap |
|---|---|---|
| Letter | the person's paste; `lib/extract.js` reads dates, IDs, insurer, amounts | `received_date` only from the person (rules count from receipt; we fall back to the letter date, which is never later) |
| Denial | `extract.js` plain rules, 9 reason categories, CARC codes, the letter's own stated deadline | `urgent` is never inferred; the person or their doctor sets it |
| Plan | keyword classifier with the words that set it shown; correctable on the page and through MCP overrides | `state` is set by the person (the first ZIP in a letter is usually the insurer's) |
| Rule | `lib/rules.js`, 29 rules, each quoted verbatim from eCFR and pinned by `npm test` | state-specific windows (Medicaid fee-for-service, state external review) are shown as the federal floor/ceiling with "your notice gives the exact number" |
| Deadline | `lib/engine.js` date arithmetic | none |
| Packet | `lib/packet.js` | `tracking` ships as a calendar file the person keeps, not server reminders, so no health data is stored. `escalation` links to the NAIC directory of state regulators rather than carrying 50 addresses |

Every field in the model is fillable. Nothing was dropped.
