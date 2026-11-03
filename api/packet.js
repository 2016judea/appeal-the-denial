// POST {session_id, letter_text, overrides} -> the paid packet, only if Stripe says the
// Checkout session from our payment link is paid. Nothing in the body is stored or logged.

import { analyze } from "../lib/engine.js";
import { buildPacket } from "../lib/packet.js";

async function paid(sessionId) {
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId || "")) return false;
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!r.ok) return false;
  const s = await r.json();
  return s.payment_status === "paid" && (!process.env.PAYMENT_LINK_ID || s.payment_link === process.env.PAYMENT_LINK_ID);
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { session_id, letter_text, overrides } = req.body || {};
  if (!(await paid(session_id))) return res.status(402).json({ error: "We couldn't confirm a payment for this link. If you paid, use the link from your receipt email or write to aidan@brickandmortar.dev." });
  if (!letter_text || String(letter_text).length < 20) return res.status(400).json({ error: "Paste your denial letter to build the packet." });
  const r = analyze(String(letter_text), overrides || {});
  return res.status(200).json(buildPacket(r));
}
