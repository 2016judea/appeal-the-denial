// GET /api/buy -> 303 to a Stripe Checkout page that shows Appeal the Denial, not Brick & Mortar.
//
// The packet sells on the Brick & Mortar Stripe account. Its payment link could only wear that
// account's name and logo, so a buyer coming from this page landed on a "Brick & Mortar" checkout
// (Aidan's standing rule, 2026-11-20: the checkout shows the product the buyer came from). A
// Checkout Session takes branding_settings per session. Same price, same return page as the link
// (plink_1UXq6uBzD4mN8eODbcwS8wdb), which stays active as the fallback below.
// Brand files are on the B&M account, rendered from public/favicon.svg and the page's serif:
// brand/icon.png, brand/logo.png.

const PRICE = "price_1UXq6tBzD4mN8eODFEcSATMD"; // $29, the link's own price
const FALLBACK = "https://buy.stripe.com/4gM5kC9hcaOlfwGak10Jq3K";
const SITE = "https://appeal-the-denial.vercel.app";

export function sessionForm() {
  return new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": PRICE,
    "line_items[0][quantity]": "1",
    "payment_method_types[0]": "card",
    "payment_method_types[1]": "link",
    customer_creation: "if_required",
    "invoice_creation[enabled]": "true",
    "invoice_creation[invoice_data][description]": "Appeal packet — Appeal the Denial (appeal-the-denial.vercel.app)",
    "metadata[product]": "appeal-the-denial",
    "payment_intent_data[metadata][product]": "appeal-the-denial",
    "payment_intent_data[statement_descriptor_suffix]": "APPEAL",
    success_url: `${SITE}/packet.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/`,
    "branding_settings[display_name]": "Appeal the Denial",
    "branding_settings[background_color]": "#f6f2ea",
    "branding_settings[button_color]": "#b3261e",
    "branding_settings[icon][type]": "file",
    "branding_settings[icon][file]": "file_1UdzxJBzD4mN8eODt0AHe755",
    "branding_settings[logo][type]": "file",
    "branding_settings[logo][file]": "file_1UdzxJBzD4mN8eODosvAiVKt",
  });
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  let url = FALLBACK;
  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: sessionForm(),
    });
    const s = await r.json();
    if (s.url) url = s.url;
    else console.error("[buy] session failed, sending the payment link:", s.error && s.error.message);
  } catch (e) {
    console.error("[buy] session failed, sending the payment link:", e.message);
  }
  res.writeHead(303, { Location: url });
  res.end();
}
