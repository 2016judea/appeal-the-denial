"""Pull the in-force text of every regulation the deadline engine cites, from eCFR.

Run: python3 scripts/fetch_regs.py   -> regs/<title>cfr<section>.txt + regs/RETRIEVED
The rule table in lib/rules.js quotes these files; re-run before changing a rule.
"""
import datetime, html, pathlib, re, urllib.request

SECTIONS = [
    (29, "2560.503-1"), (29, "2590.715-2719"), (45, "147.136"),
    (42, "422.582"), (42, "422.584"), (42, "422.590"), (42, "422.592"),
    (42, "438.402"), (42, "438.408"), (42, "438.410"), (42, "431.221"), (42, "405.942"), (5, "890.105"),
]
out = pathlib.Path(__file__).resolve().parent.parent / "regs"
out.mkdir(exist_ok=True)
for title, sec in SECTIONS:
    url = f"https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-{title}?section={sec}"
    req = urllib.request.Request(url, headers={"User-Agent": "appeal-the-denial/1.0"})
    raw = urllib.request.urlopen(req, timeout=60).read().decode()
    text = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw)))
    (out / f"{title}cfr{sec}.txt").write_text(text)
    print(title, sec, len(text))
(out / "RETRIEVED").write_text(datetime.date.today().isoformat() + "\n")
