"""Build chatgpt-plugin.zip for platform.openai.com/plugins (Agent Plugins schema).
Format copied from small-business-intelligence-mcp/scripts/build_chatgpt_plugin.py (2026-10-09).
Portal traps: no pricing words ("Free") in descriptions; bump VERSION every upload."""
import json, shutil, zipfile
from pathlib import Path
from PIL import Image

VERSION = "1.0.1"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "chatgpt-plugin"
ASSETS = OUT / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)

src = Image.open(ROOT / "submission/icon/icon-512.png")
src.save(ASSETS / "logo.png", optimize=True)
src.save(ASSETS / "composer-icon.png", optimize=True)
src.resize((64, 64), Image.LANCZOS).save(ASSETS / "composer-icon-dark.png", optimize=True)

DESC = ("Appeal the Denial reads a health insurance denial letter, explanation of benefits or adverse "
        "benefit determination that the person pastes in, and returns what was denied and the reason the "
        "insurer gave; which appeal rules apply (employer plan under ERISA, ACA Marketplace, Medicare "
        "Advantage, Medicaid managed care, Original Medicare, FEHB); the appeal deadline, computed in code "
        "from the federal regulation and cited to it; who decides next if the appeal fails; and a draft "
        "appeal letter. It never judges whether care was medically necessary and gives no medical advice: "
        "the clinical case comes from the person's own doctor, and the draft asks for that letter. Both tools "
        "are read-only. The letter is used only for the request and nothing is stored. No account is needed.")

plugin = {
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "appeal-the-denial",
  "version": VERSION,
  "description": DESC,
  "author": {"name": "Brick and Mortar AI LLC", "url": "https://appeal-the-denial.vercel.app/"},
  "homepage": "https://appeal-the-denial.vercel.app/",
  "license": "MIT",
  "keywords": ["health insurance", "claim denial", "appeal", "deadlines"],
  "extensions": {"com.openai": {
    "interface": {
      "displayName": "Appeal the Denial",
      "shortDescription": "Appeal an insurance denial",
      "longDescription": DESC,
      "developerName": "Brick and Mortar AI LLC",
      "category": "Productivity",
      "capabilities": [],
      "websiteURL": "https://appeal-the-denial.vercel.app/",
      "supportURL": "https://appeal-the-denial.vercel.app/",
      "privacyPolicyURL": "https://appeal-the-denial.vercel.app/privacy.html",
      "termsOfServiceURL": "https://appeal-the-denial.vercel.app/privacy.html",
      "defaultPrompt": [
        "My insurer denied my MRI. Here's the letter: when is my appeal due?",
        "My Medicare Advantage plan denied a claim in a letter dated October 30, 2026. When's my appeal due?",
        "My employer plan denied my final appeal on October 30, 2026. What now?"
      ],
      "logo": "./assets/logo.png",
      "composerIcon": "./assets/composer-icon.png",
      "composerIconDark": "./assets/composer-icon-dark.png"
    },
    "review": {
      "test_cases": {
        "positive": [
          {"description": "Read an employer-plan (ERISA) denial letter and return the appeal deadline and a draft letter.",
           "prompt": open(ROOT/"examples/erisa_mri.txt").read().strip() + "\n\nWhat's my deadline and what do I send?",
           "tools_triggered": "read_denial_letter",
           "expected_behavior": "Identifies an ERISA employer plan; internal appeal due Mon, April 12, 2027, cited to 29 CFR 2560.503-1(h)(3)(i); returns a draft appeal letter that asks for the treating doctor's letter."},
          {"description": "Read a Medicare Advantage denial and return the reconsideration deadline.",
           "prompt": open(ROOT/"examples/medicare_advantage_pt.txt").read().strip() + "\n\nHelp me appeal this.",
           "tools_triggered": "read_denial_letter",
           "expected_behavior": "Identifies Medicare Advantage; reconsideration due Mon, December 21, 2026; notes the plan must forward an upheld denial to the Independent Review Entity."},
          {"description": "Read a Medicaid managed-care drug denial.",
           "prompt": open(ROOT/"examples/medicaid_mco_drug.txt").read().strip(),
           "tools_triggered": "read_denial_letter",
           "expected_behavior": "Identifies Medicaid managed care; appeal due Fri, January 1, 2027, cited to 42 CFR 438.402(c)(2)(ii)."},
          {"description": "Compute a deadline from a plan type and letter date without a letter.",
           "prompt": "My Medicare Advantage plan denied a claim in a letter dated October 30, 2026. When's my appeal due?",
           "tools_triggered": "appeal_deadlines",
           "expected_behavior": "Returns Sun, January 3, 2027 (five days presumed receipt plus 60 days), cited to 42 CFR 422.582."},
          {"description": "Return the external review deadline after a final internal denial on an employer plan.",
           "prompt": "My employer plan denied my final appeal on October 30, 2026. What now?",
           "tools_triggered": "appeal_deadlines",
           "expected_behavior": "Returns an external review request due Mon, March 1, 2027, cited to 29 CFR 2590.715-2719(d)(2)(i)."}
        ],
        "negative": [
          {"description": "Do not judge medical necessity; the app gives no medical advice.",
           "prompt": "Was my MRI medically necessary?"},
          {"description": "Do not trigger for general health questions unrelated to an insurance denial.",
           "prompt": "What are the side effects of ibuprofen?"},
          {"description": "Do not trigger for a request to contact the insurer; the app sends nothing.",
           "prompt": "Call my insurance company and file the appeal for me."}
        ]
      },
      "commerce": False,
      "commerce_description": "No purchase or payment happens in ChatGPT. The tools return only the deadline, the appeal path and a draft letter."
    },
    "publication": {"countries": ["US"], "release_notes": "1.0.1: first release."}
  }}
}
mcp = {"$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
       "mcpServers": {"appeal-the-denial": {"type": "streamable-http", "url": "https://appeal-the-denial.vercel.app/mcp"}}}

(OUT/"plugin.json").write_text(json.dumps(plugin, indent=2, ensure_ascii=False) + "\n")
(OUT/"mcp.json").write_text(json.dumps(mcp, indent=2) + "\n")
banned = ["free", "price", "$", "subscription", "paid"]
hits = [w for w in banned if w in DESC.lower()]
assert not hits, f"pricing words in description: {hits}"
zp = ROOT/"chatgpt-plugin.zip"
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob("*")):
        if p.is_file(): z.write(p, p.relative_to(OUT))
print(zp, zp.stat().st_size, "bytes")
