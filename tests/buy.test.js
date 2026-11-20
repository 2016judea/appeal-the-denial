import { test } from "node:test";
import assert from "node:assert/strict";
import handler, { sessionForm } from "../api/buy.js";

test("the checkout session carries Appeal the Denial's brand, an invoice and the packet return page", () => {
  const f = sessionForm();
  assert.equal(f.get("branding_settings[display_name]"), "Appeal the Denial");
  assert.ok(f.get("branding_settings[icon][file]").startsWith("file_"));
  assert.ok(f.get("branding_settings[logo][file]").startsWith("file_"));
  assert.equal(f.get("invoice_creation[enabled]"), "true");
  assert.equal(f.get("metadata[product]"), "appeal-the-denial");
  assert.equal(f.get("success_url"), "https://appeal-the-denial.vercel.app/packet.html?session_id={CHECKOUT_SESSION_ID}");
  assert.ok(f.get("payment_intent_data[statement_descriptor_suffix]").length <= 10);
});

test("if Stripe refuses the session, the buyer still reaches the payment link", async () => {
  globalThis.fetch = async () => ({ json: async () => ({ error: { message: "nope" } }) });
  const out = await new Promise((resolve) => {
    const res = { setHeader() {}, writeHead(code, h) { this.code = code; this.h = h; }, end() { resolve(this); } };
    handler({ method: "GET" }, res);
  });
  assert.equal(out.code, 303);
  assert.equal(out.h.Location, "https://buy.stripe.com/4gM5kC9hcaOlfwGak10Jq3K");
});
