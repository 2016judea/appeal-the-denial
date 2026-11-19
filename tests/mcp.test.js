import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import handler from "../api/mcp.js";

const letter = readFileSync(new URL("../examples/erisa_mri.txt", import.meta.url), "utf8");
const realFetch = globalThis.fetch;
const sent = [];
let srv, base;

before(async () => {
  globalThis.fetch = async (url, opts) => { if (String(url).includes("posthog")) { sent.push(opts.body); return { ok: true }; } return realFetch(url, opts); };
  srv = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    req.body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined;
    res.status = (c) => { res.statusCode = c; return res; }; res.json = (o) => res.end(JSON.stringify(o));
    await handler(req, res);
  });
  await new Promise((r) => srv.listen(0, r));
  base = `http://127.0.0.1:${srv.address().port}/mcp`;
});
after(() => { srv.close(); globalThis.fetch = realFetch; });

const call = async (name, args, headers = {}) => (await realFetch(base, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": "Claude-User", ...headers },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) })).json();

test("read_denial_letter hands back a src=mcp link whose letter facts are only after the #", async () => {
  const r = (await call("read_denial_letter", { letter_text: letter })).result;
  const url = new URL(r.structuredContent.open_url);
  assert.equal(url.origin + url.pathname, "https://appeal-the-denial.vercel.app/appeal");
  assert.equal(url.search, "?src=mcp");
  assert.match(url.hash, /mi=NSH448812907/);
  assert.ok(r.content[0].text.includes(r.structuredContent.open_url));
  assert.match(r.content[0].text, /\*\*Send it to:\*\* Northstar Appeals/);
});

test("one mcp_tool_call per call, with no letter text, name, ID, date, insurer or service", async () => {
  sent.length = 0;
  await call("read_denial_letter", { letter_text: letter }, { "x-atd-test": "1" });
  await call("appeal_deadlines", { plan_type: "medicare_advantage", letter_date: "2026-10-30" });
  assert.equal(sent.length, 2);
  for (const body of sent) {
    for (const bad of ["Jordan", "Rivera", "NSH448812907", "26-0918", "Northstar", "MRI", "lumbar", "2026-10", "Lakeside", "medically necessary"]) assert.ok(!body.includes(bad), `event carries ${bad}`);
    const e = JSON.parse(body);
    assert.equal(e.event, "mcp_tool_call");
    assert.match(e.distinct_id, /^mcp_[0-9a-f-]{36}$/); // random per call: never IP + user agent
    assert.equal(e.properties.$process_person_profile, false);
  }
  const [a, b] = sent.map((x) => JSON.parse(x).properties);
  assert.deepEqual([a.tool, a.ok, a.plan_type, a.reason_category, a.client, a.test, a.link], ["read_denial_letter", true, "erisa", "medical_necessity", "claude", true, true]);
  assert.deepEqual([b.tool, b.ok, b.plan_type, b.test], ["appeal_deadlines", true, "medicare_advantage", undefined]);
});
