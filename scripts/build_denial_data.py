#!/usr/bin/env python3
"""Insurer denial rates from CMS's Transparency in Coverage public use file -> data/denial-rates-2025.json

    python3 scripts/build_denial_data.py            # downloads both files from CMS
    python3 scripts/build_denial_data.py --cache DIR  # reuse zips already in DIR

Standard library only (an .xlsx is a zip of XML). Every percentage is computed here from the two
counts CMS prints beside it; nothing is estimated, and a model never touches a number.

Source: https://www.cms.gov/marketplace/resources/data/public-use-files
  PY2027 file (posted 2026-10-30) = plan year 2025 data. PY2026 file = 2024 data (comparison).
One row per insurer per state, from the "Ind QHP" sheet (individual Marketplace medical plans).
The insurer-level columns repeat on every plan row of that insurer; we take them once and fail
loudly if two plan rows of one insurer disagree.
"""
import argparse, hashlib, json, re, sys, urllib.request, zipfile, io, datetime
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "denial-rates-2025.json"
FILES = {
    2025: "https://download.cms.gov/marketplace-puf/2027/transparency-in-coverage-puf.zip",
    2024: "https://download.cms.gov/marketplace-puf/2026/transparency-in-coverage-puf.zip",
}
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
STATES = {"AK": "Alaska", "AL": "Alabama", "AR": "Arkansas", "AZ": "Arizona", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DC": "District of Columbia", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "IA": "Iowa", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "MA": "Massachusetts", "MD": "Maryland", "ME": "Maine", "MI": "Michigan", "MN": "Minnesota", "MO": "Missouri", "MS": "Mississippi", "MT": "Montana", "NC": "North Carolina", "ND": "North Dakota", "NE": "Nebraska", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NV": "Nevada", "NY": "New York", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VA": "Virginia", "VT": "Vermont", "WA": "Washington", "WI": "Wisconsin", "WV": "West Virginia", "WY": "Wyoming"}


def fetch(url, cache):
    if cache:
        p = Path(cache) / (url.split("/")[-2] + ".zip")
        if p.exists():
            return p.read_bytes(), None
    req = urllib.request.Request(url, headers={"user-agent": "appeal-the-denial data build"})
    with urllib.request.urlopen(req, timeout=120) as r:
        body, modified = r.read(), r.headers.get("last-modified")
    if cache:
        Path(cache).mkdir(parents=True, exist_ok=True)
        (Path(cache) / (url.split("/")[-2] + ".zip")).write_bytes(body)
    return body, modified


def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def sheet_rows(xlsx_bytes, want):
    """Yield each row (list of str|None) of the first sheet whose name contains `want`."""
    z = zipfile.ZipFile(io.BytesIO(xlsx_bytes))
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    target = None
    for s in wb.find("m:sheets", NS):
        if want in s.get("name"):
            target = rels[s.get(RNS)].lstrip("/")
            target = target if target.startswith("xl/") else "xl/" + target
            break
    if not target:
        raise SystemExit(f"no sheet named like {want!r}")
    for row in ET.fromstring(z.read(target)).find("m:sheetData", NS):
        out = []
        for c in row.findall("m:c", NS):
            i = col_index(c.get("r"))
            while len(out) < i:
                out.append(None)
            t, v = c.get("t"), c.find("m:v", NS)
            if t == "s":
                val = shared[int(v.text)]
            elif t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
            else:
                val = v.text if v is not None else None
            out.append(val)
        yield out


def zip_xlsx(zbytes):
    z = zipfile.ZipFile(io.BytesIO(zbytes))
    name = next(n for n in z.namelist() if n.lower().endswith(".xlsx"))
    return z.read(name)


def num(v):
    if v is None:
        return None
    try:
        f = float(str(v).replace(",", ""))
        return int(f) if f == int(f) else f
    except ValueError:
        return None


def raw(v):
    """What CMS printed, for a cell that is not a number: ** suppressed, N/A new, * not available."""
    return None if v is None or num(v) is not None else str(v).strip()


def pct(part, whole):
    """part/whole as a percent to 0.1, half rounded up, in exact integer arithmetic (Python's round()
    sends 31.25 to 31.2; a reader checking by hand gets 31.3)."""
    if not (isinstance(part, int) and isinstance(whole, int) and whole > 0):
        return None
    return ((2 * part * 1000 + whole) // (2 * whole)) / 10


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", " and "))).strip("-")


ISSUER_COLS = [
    "Issuer_Pre_Service_Benefit_Requests_Received", "Issuer_Pre_Service_Benefit_Requests_Denied",
    "Issuer_Claims_Received_In_Network", "Issuer_Claims_Denied_In_Network",
    "Issuer_Claims_Received_Out_Of_Network", "Issuer_Claims_Denied_Out_Of_Network",
    "Issuer_Internal_Appeals_Claims_Filed", "Issuer_Number_Internal_Appeals_Claims_Overturned",
    "Issuer_Internal_Appeals_Pre_Service_Benefit_Requests_Filed", "Issuer_Number_Internal_Appeals_Pre_Service_Benefit_Requests_Overturned",
    "Issuer_External_Appeals_Claims_Filed", "Issuer_Number_External_Appeals_Claims_Overturned",
]


def issuers(xlsx):
    rows = sheet_rows(xlsx, "Ind QHP")
    hdr = None
    for r in rows:
        if r and "Issuer_ID" in r:
            hdr = r
            break
    ix = {h: i for i, h in enumerate(hdr) if h}
    get = lambda r, h: r[ix[h]] if h in ix and ix[h] < len(r) else None
    out = {}
    for r in rows:
        if not r or not get(r, "Issuer_ID"):
            continue
        key = (get(r, "State"), str(get(r, "Issuer_ID")))
        rec = {h: get(r, h) for h in ISSUER_COLS if h in ix}
        rec.update(name=get(r, "Issuer_Name"), exchange=get(r, "Exchange_Type"), new=get(r, "Is_Issuer_New_to_Exchange?(Yes_or_No)"), policy_url=get(r, "URL_Claims_Payment_Policies"))
        if key in out:
            for h in ISSUER_COLS:
                if h in rec and rec[h] != out[key][h]:
                    raise SystemExit(f"{key}: plan rows disagree on {h}: {rec[h]!r} vs {out[key][h]!r}")
            continue
        out[key] = rec
    return out


def pair(rec, a, b):
    """{received, denied, pct} with CMS's own marker kept when a count is not a number."""
    x, y = num(rec.get(a)), num(rec.get(b))
    return {"n": x, "k": y, "pct": pct(y, x), "mark": raw(rec.get(b)) or raw(rec.get(a))}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache")
    a = ap.parse_args()
    now = datetime.date.today().isoformat()
    meta_files, years = {}, {}
    for year, url in FILES.items():
        body, modified = fetch(url, a.cache)
        meta_files[year] = {"url": url, "sha256": hashlib.sha256(body).hexdigest(), "last_modified": modified, "retrieved": now}
        years[year] = issuers(zip_xlsx(body))

    rows, seen = [], set()
    for (st, iid), r in sorted(years[2025].items(), key=lambda kv: (STATES.get(kv[0][0], kv[0][0]), kv[1]["name"])):
        claims = pair(r, "Issuer_Claims_Received_In_Network", "Issuer_Claims_Denied_In_Network")
        oon = pair(r, "Issuer_Claims_Received_Out_Of_Network", "Issuer_Claims_Denied_Out_Of_Network")
        pa = pair(r, "Issuer_Pre_Service_Benefit_Requests_Received", "Issuer_Pre_Service_Benefit_Requests_Denied")
        appeals = pair(r, "Issuer_Internal_Appeals_Claims_Filed", "Issuer_Number_Internal_Appeals_Claims_Overturned")
        pa_appeals = pair(r, "Issuer_Internal_Appeals_Pre_Service_Benefit_Requests_Filed", "Issuer_Number_Internal_Appeals_Pre_Service_Benefit_Requests_Overturned")
        ext = pair(r, "Issuer_External_Appeals_Claims_Filed", "Issuer_Number_External_Appeals_Claims_Overturned")
        prev = years[2024].get((st, iid))
        prev_claims = pair(prev, "Issuer_Claims_Received_In_Network", "Issuer_Claims_Denied_In_Network") if prev else None
        s = slug(r["name"])
        if (st, s) in seen:
            s = f"{s}-{iid}"
        seen.add((st, s))
        rows.append({
            "state": st, "state_name": STATES.get(st, st), "state_slug": slug(STATES.get(st, st)),
            "insurer": r["name"].strip(), "insurer_id": iid, "slug": s, "exchange_type": r["exchange"],
            "new_to_exchange": str(r["new"]).strip().lower() == "yes", "claims_policy_url": r["policy_url"] if str(r["policy_url"] or "").startswith("http") else None,
            "claims_in_network": claims, "claims_out_of_network": oon, "prior_auth": pa,
            "internal_appeals_claims": appeals, "internal_appeals_prior_auth": pa_appeals, "external_appeals_claims": ext,
            "claims_in_network_2024": prev_claims,
        })

    def total(key):
        n = sum(r[key]["n"] for r in rows if isinstance(r[key]["n"], (int, float)) and isinstance(r[key]["k"], (int, float)))
        k = sum(r[key]["k"] for r in rows if isinstance(r[key]["n"], (int, float)) and isinstance(r[key]["k"], (int, float)))
        return {"n": n, "k": k, "pct": pct(k, n)}

    with_data = [r for r in rows if r["claims_in_network"]["pct"] is not None]
    out = {
        "title": "Health insurance denial rates by insurer, Marketplace plans on HealthCare.gov, 2025",
        "data_year": 2025,
        "built": now,
        "source": {
            "name": "Centers for Medicare & Medicaid Services, Transparency in Coverage Public Use File, plan year 2027 (2025 data); plan year 2026 file for 2024",
            "page": "https://www.cms.gov/marketplace/resources/data/public-use-files",
            "dictionary": "https://www.cms.gov/files/document/transparency-coverage-datadictionary-py27.pdf",
            "files": {str(k): v for k, v in meta_files.items()},
            "scope": "Individual Marketplace medical plans (QHPs) sold through HealthCare.gov: Federally-facilitated Exchanges, including states that do plan management, and state-based exchanges on the federal platform. Not employer plans, Medicare, Medicaid, or states that run their own exchange (for example California, New York, Minnesota).",
            "reported_by": "Each insurer reports its own counts to CMS (45 CFR 156.220). CMS: 'Claims denials are not necessarily indicative of issuer strength or plan quality.'",
        },
        "method": "One row per insurer per state. Claims denied % = in-network claims denied / in-network claims received, both with dates of service in 2025. Prior authorization denied % = pre-service benefit requests denied / received in 2025 (first published in this file). Appeals won % = internal appeals of claims overturned / filed. Percentages computed by appeal-the-denial from CMS's counts, rounded to 0.1. ** = CMS suppressed a small count; N/A = insurer new to the Exchange, no 2025 data.",
        "national": {
            "insurers": len(rows), "insurers_with_data": len(with_data), "states": len({r["state"] for r in rows}),
            "claims_in_network": total("claims_in_network"), "prior_auth": total("prior_auth"),
            "internal_appeals_claims": total("internal_appeals_claims"),
        },
        "rows": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    n = out["national"]
    print(f"{OUT.relative_to(ROOT)}: {n['insurers']} insurer-state rows ({n['insurers_with_data']} with 2025 claims) in {n['states']} states; "
          f"claims denied {n['claims_in_network']['pct']}%, prior auth denied {n['prior_auth']['pct']}%, appeals won {n['internal_appeals_claims']['pct']}%")


if __name__ == "__main__":
    main()
