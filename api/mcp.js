// Remote MCP server (Streamable HTTP, stateless) for ChatGPT apps and Claude connectors.
// Free and read-only. Nothing is sold, linked for sale or stored here: the letter text
// lives only for the length of the request.
//
// Each answer carries a link that opens /appeal already filled in (deadline, where to send,
// the letter, a calendar file). The letter's facts ride in the URL fragment, which no server
// ever receives (lib/share.js says why). The link carries src=mcp so a landing is countable.
// One PostHog event per tool call (ANALYTICS.md): tool, ok, ms, client, plan type, reason
// category. Never letter text, names, IDs, dates, insurer or service.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { analyze } from "../lib/engine.js";
import { PLAN_TYPES, STAGES, REASONS } from "../lib/rules.js";
import { pretty } from "../lib/dates.js";
import { toFragment } from "../lib/share.js";

export const SITE = "https://appeal-the-denial.vercel.app";
const PH_KEY = "phc_yFgRGppL6H7DvhgZTQKbHdrY5oqnpLT482rrNYtLqnAx"; // public project key, same as lib/posthog.html

// The page that opens filled in. src=mcp is the only query parameter; everything about the
// letter is after the "#".
export const openLink = (fields) => `${SITE}/appeal?src=mcp#${toFragment(fields)}`;

const clientOf = (ua) => (/claude/i.test(ua) ? "claude" : /openai|chatgpt/i.test(ua) ? "chatgpt" : /grok|xai/i.test(ua) ? "grok" : /cursor/i.test(ua) ? "cursor" : /node|undici|python|curl|axios|go-http/i.test(ua) ? "script" : "other");

// Calls from claude.ai arrive from Anthropic's servers, so an id built from IP + user agent
// would count Anthropic, not people (heistclips 2026-11-19: "65 users", 42-55 every hour).
// Each event gets a random id and no person profile; people are counted on the web side, as
// visits to /appeal that carry src=mcp.
export async function logCall(props, meta = {}) {
  if (process.env.ATD_NO_ANALYTICS) return;
  const safe = {};
  for (const k of ["tool", "ok", "ms", "err", "plan_type", "reason_category", "deadline_found", "days_left_band", "link"]) if (props[k] !== undefined && props[k] !== null) safe[k] = props[k];
  try {
    await fetch("https://us.i.posthog.com/capture/", { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(1500),
      body: JSON.stringify({ api_key: PH_KEY, event: "mcp_tool_call", distinct_id: "mcp_" + crypto.randomUUID(),
        properties: { ...safe, client: meta.client || "other", client_ua: String(meta.ua || "").split(/[\/ ;(]/)[0].slice(0, 30), test: meta.test ? true : undefined, site: "appeal-the-denial", $host: "appeal-the-denial.vercel.app", $process_person_profile: false, $lib: "appeal-the-denial-mcp" } }) });
  } catch {}
}

// A coarse band, never the date: how close the person is to the deadline when they ask.
export const band = (d) => (d == null ? undefined : d < 0 ? "past" : d <= 14 ? "0-14" : d <= 60 ? "15-60" : d <= 120 ? "61-120" : "121+");

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD");
const overrides = {
  plan_type: z.enum(Object.keys(PLAN_TYPES)).optional().describe("Set only if the letter or the person says so: " + Object.entries(PLAN_TYPES).map(([k, v]) => `${k} = ${v}`).join("; ")),
  letter_date: date.optional().describe("Date printed on the letter, if the reader missed it"),
  received_date: date.optional().describe("Day the person actually received the letter, if they say"),
  stage: z.enum(Object.keys(STAGES)).optional().describe("pre_service = prior authorization, post_service = a claim for care already given, concurrent = ongoing care being cut"),
  urgent: z.boolean().optional().describe("True only if the person or their doctor says waiting could seriously harm their health. Never infer it."),
  internal_appeal_level: z.enum(["initial", "final"]).optional().describe("final = this letter denies an appeal already filed"),
  self_funded: z.boolean().optional().describe("Employer plan paid by the employer itself (often 'self-funded', 'claims administrator')"),
  grandfathered: z.boolean().optional(),
  two_level_appeals: z.boolean().optional().describe("Employer plan with two internal appeal levels"),
  part_b_drug: z.boolean().optional(),
  reason_category: z.enum(Object.keys(REASONS)).optional(),
  patient_name: z.string().optional(), member_id: z.string().optional(), claim_number: z.string().optional(),
  insurer_name: z.string().optional(), provider_name: z.string().optional(), service_denied: z.string().optional(),
};

function render(r, link) {
  const out = [];
  const file = r.deadlines.find((d) => d.kind.startsWith("file_"));
  if (file) out.push(`**${file.label} ${pretty(file.due_date)}** (${file.days_left} days from today). Source: ${file.rule.cite}.`);
  if (link) out.push("", `**Open it ready to send** (deadline, where to send it, your letter, a calendar file): ${link}`);
  if (r.problems.length) out.push(...r.problems.map((p) => `- ${p}`));
  out.push("", `**Denied:** ${r.summary.service_denied || "not found in the letter"}`,
    `**Reason given:** ${r.summary.reason_label}${r.summary.reason_codes.length ? ` (codes ${r.summary.reason_codes.join(", ")})` : ""}`,
    `**Send it to:** ${r.fields.appeal_to || "the appeals address on your letter"}`,
    `**Plan type:** ${r.plan.label}${r.plan.evidence ? ` — from: "${r.plan.evidence}"` : ""}`,
    `**Path:** ${r.path.join(" → ") || "pick the plan type"}`,
    `**Next step:** ${r.next_step}`, "", "**Deadlines (computed from the rules, not estimated):**");
  for (const d of r.deadlines) out.push(`- ${d.label} ${pretty(d.due_date)} — ${d.rule.cite} (${d.rule.url})${d.counted_from ? `; counted from ${d.counted_from}` : ""}${d.letter_says ? `; your letter says ${pretty(d.letter_says.date)}` : ""}`);
  for (const n of r.notes) out.push(`- ${n.text} (${n.rule.cite})`);
  out.push("", `**Draft ${r.appeal_name} letter:**`, "```", r.appeal_letter, "```", "", `_${r.not_medical_advice}_`);
  return out.join("\n");
}

const RULES_FOR_HOST = "Show the deadlines exactly as returned; never compute or adjust a date yourself. Show the open link exactly as returned, in full: it opens the person's deadline, letter and calendar file on the website, and is free. Do not judge whether the care was medically necessary or give medical advice: the clinical argument comes from the person's own doctor.";

// Times a tool, logs one event, and turns a throw into an error result.
function logged(tool, meta, fn) {
  return async (args) => {
    const t0 = Date.now();
    let out, info = {};
    try { ({ out, info = {} } = await fn(args)); }
    catch (e) { out = { content: [{ type: "text", text: "Something went wrong reading that. Try again, or paste the letter at " + SITE }], isError: true }; info = { err: "exception" }; }
    await logCall({ tool, ok: !out.isError, ms: Date.now() - t0, ...info }, meta);
    return out;
  };
}

function buildServer(meta = {}) {
  const server = new McpServer({ name: "appeal-the-denial", version: "1.1.0" }, {
    instructions: "Reads a health insurance denial letter and returns what was denied, the plan type, the appeal path, every deadline with its regulation, and a draft appeal letter. " + RULES_FOR_HOST,
  });

  server.registerTool("read_denial_letter", {
    title: "Read a denial letter",
    description: "Use when someone pastes or uploads a health insurance denial, EOB or adverse benefit determination. Pass the letter text verbatim. Returns what was denied, the reason category, the plan type (employer/ERISA, Marketplace, Medicare Advantage, Medicaid), the appeal deadline computed from the regulation, the next step and a draft appeal letter. The optional fields correct something the person stated. Deadlines are computed in code from the cited regulation. The tool does not assess medical necessity.",
    inputSchema: { letter_text: z.string().min(20).describe("The full text of the denial letter, verbatim"), ...overrides },
    annotations: { title: "Read a denial letter", readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true },
  }, logged("read_denial_letter", meta, async ({ letter_text, ...o }) => {
    const r = analyze(letter_text, o);
    const { fields, ...rest } = r;
    const link = openLink(fields);
    const file = r.deadlines.find((d) => d.kind.startsWith("file_"));
    return {
      out: { content: [{ type: "text", text: render(r, link) }], structuredContent: { ...rest, open_url: link, extracted: { letter_date: fields.letter_date, insurer_name: fields.insurer_name, claim_number: fields.claim_number, member_id: fields.member_id, appeal_to: fields.appeal_to } } },
      info: { plan_type: r.plan.plan_type || "unknown", reason_category: r.summary.reason_category, deadline_found: !!file, days_left_band: band(file && file.days_left), link: true, err: file ? undefined : "no_deadline" },
    };
  }));

  server.registerTool("appeal_deadlines", {
    title: "Appeal deadlines",
    description: "Compute health insurance appeal deadlines when there is no letter text, only facts: plan type and the date on the denial. Returns each deadline with the regulation it comes from, computed in code. The tool does not assess medical necessity.",
    inputSchema: {
      plan_type: overrides.plan_type.unwrap(), letter_date: date.describe("Date printed on the denial"),
      received_date: overrides.received_date, stage: overrides.stage, urgent: overrides.urgent,
      internal_appeal_level: overrides.internal_appeal_level, self_funded: overrides.self_funded,
      grandfathered: overrides.grandfathered, two_level_appeals: overrides.two_level_appeals, part_b_drug: overrides.part_b_drug,
    },
    annotations: { title: "Appeal deadlines", readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true },
  }, logged("appeal_deadlines", meta, async (o) => {
    const r = analyze("", o);
    const link = openLink(r.fields);
    const file = r.deadlines.find((d) => d.kind.startsWith("file_"));
    const lines = r.deadlines.map((d) => `- ${d.label} ${pretty(d.due_date)} — ${d.rule.cite} (${d.rule.url})`);
    return {
      out: { content: [{ type: "text", text: [`**Path:** ${r.path.join(" → ")}`, ...lines, ...r.notes.map((n) => `- ${n.text} (${n.rule.cite})`), "", `**Open it with a calendar file and a draft letter:** ${link}`].join("\n") }], structuredContent: { path: r.path, deadlines: r.deadlines, notes: r.notes, open_url: link } },
      info: { plan_type: r.plan.plan_type || "unknown", deadline_found: !!file, days_left_band: band(file && file.days_left), link: true, err: file ? undefined : "no_deadline" },
    };
  }));

  return server;
}

export default async function handler(req, res) {
  if (req.method === "GET" && !String(req.headers.accept || "").includes("text/event-stream")) {
    res.setHeader("content-type", "application/json");
    return res.status(200).end(JSON.stringify({ name: "appeal-the-denial", transport: "streamable-http", endpoint: "/mcp", tools: ["read_denial_letter", "appeal_deadlines"] }));
  }
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  }
  const ua = String(req.headers["user-agent"] || "");
  const server = buildServer({ ua, client: clientOf(ua), test: String(req.headers["x-atd-test"] || "") === "1" }); // per request: no caller kept in a shared variable
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
