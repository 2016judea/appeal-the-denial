// Remote MCP server (Streamable HTTP, stateless) for ChatGPT apps and Claude connectors.
// Free and read-only. Nothing is sold, linked for sale or stored here: the letter text
// lives only for the length of the request.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { analyze } from "../lib/engine.js";
import { PLAN_TYPES, STAGES, REASONS } from "../lib/rules.js";
import { pretty } from "../lib/dates.js";

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

function render(r) {
  const out = [];
  const file = r.deadlines.find((d) => d.kind.startsWith("file_"));
  if (file) out.push(`**${file.label} ${pretty(file.due_date)}** (${file.days_left} days from today). Source: ${file.rule.cite}.`);
  if (r.problems.length) out.push(...r.problems.map((p) => `- ${p}`));
  out.push("", `**Denied:** ${r.summary.service_denied || "not found in the letter"}`,
    `**Reason given:** ${r.summary.reason_label}${r.summary.reason_codes.length ? ` (codes ${r.summary.reason_codes.join(", ")})` : ""}`,
    `**Plan type:** ${r.plan.label}${r.plan.evidence ? ` — from: "${r.plan.evidence}"` : ""}`,
    `**Path:** ${r.path.join(" → ") || "pick the plan type"}`,
    `**Next step:** ${r.next_step}`, "", "**Deadlines (computed from the rules, not estimated):**");
  for (const d of r.deadlines) out.push(`- ${d.label} ${pretty(d.due_date)} — ${d.rule.cite} (${d.rule.url})${d.counted_from ? `; counted from ${d.counted_from}` : ""}${d.letter_says ? `; your letter says ${pretty(d.letter_says.date)}` : ""}`);
  for (const n of r.notes) out.push(`- ${n.text} (${n.rule.cite})`);
  out.push("", `**Draft ${r.appeal_name} letter:**`, "```", r.appeal_letter, "```", "", `_${r.not_medical_advice}_`);
  return out.join("\n");
}

const RULES_FOR_HOST = "Show the deadlines exactly as returned; never compute or adjust a date yourself. Do not judge whether the care was medically necessary or give medical advice: the clinical argument comes from the person's own doctor.";

function buildServer() {
  const server = new McpServer({ name: "appeal-the-denial", version: "1.0.0" }, {
    instructions: "Reads a health insurance denial letter and returns what was denied, the plan type, the appeal path, every deadline with its regulation, and a draft appeal letter. " + RULES_FOR_HOST,
  });

  server.registerTool("read_denial_letter", {
    title: "Read a denial letter",
    description: "Use when someone pastes or uploads a health insurance denial, EOB or adverse benefit determination. Pass the letter text verbatim. Returns what was denied, the reason category, the plan type (employer/ERISA, Marketplace, Medicare Advantage, Medicaid), the appeal deadline computed from the regulation, the next step and a draft appeal letter. Use the optional fields only to correct something the person told you. " + RULES_FOR_HOST,
    inputSchema: { letter_text: z.string().min(20).describe("The full text of the denial letter, verbatim"), ...overrides },
    annotations: { title: "Read a denial letter", readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true },
  }, async ({ letter_text, ...o }) => {
    const r = analyze(letter_text, o);
    const { fields, ...rest } = r;
    return { content: [{ type: "text", text: render(r) }], structuredContent: { ...rest, extracted: { letter_date: fields.letter_date, insurer_name: fields.insurer_name, claim_number: fields.claim_number, member_id: fields.member_id } } };
  });

  server.registerTool("appeal_deadlines", {
    title: "Appeal deadlines",
    description: "Compute health insurance appeal deadlines when there is no letter text, only facts: plan type and the date on the denial. Returns each deadline with the regulation it comes from. " + RULES_FOR_HOST,
    inputSchema: {
      plan_type: overrides.plan_type.unwrap(), letter_date: date.describe("Date printed on the denial"),
      received_date: overrides.received_date, stage: overrides.stage, urgent: overrides.urgent,
      internal_appeal_level: overrides.internal_appeal_level, self_funded: overrides.self_funded,
      grandfathered: overrides.grandfathered, two_level_appeals: overrides.two_level_appeals, part_b_drug: overrides.part_b_drug,
    },
    annotations: { title: "Appeal deadlines", readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true },
  }, async (o) => {
    const r = analyze("", o);
    const lines = r.deadlines.map((d) => `- ${d.label} ${pretty(d.due_date)} — ${d.rule.cite} (${d.rule.url})`);
    return { content: [{ type: "text", text: [`**Path:** ${r.path.join(" → ")}`, ...lines, ...r.notes.map((n) => `- ${n.text} (${n.rule.cite})`)].join("\n") }], structuredContent: { path: r.path, deadlines: r.deadlines, notes: r.notes } };
  });

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
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
