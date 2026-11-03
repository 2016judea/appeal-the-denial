// Date arithmetic for deadlines. Dates are plain YYYY-MM-DD strings, computed in UTC
// so a server in one timezone and a phone in another give the same answer.

export function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
}

export const iso = (d) => d.toISOString().slice(0, 10);

export function addDays(s, n) {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

// 29 CFR 2590.715-2719(d)(2)(i) / 45 CFR 147.136(d)(2)(i): "within four months after the
// date of receipt ... If there is no corresponding date four months after the date of
// receipt of such a notice, then the request must be filed by the first day of the fifth
// month following the receipt of the notice." (Oct 30 -> Mar 1.)
export function addFourMonths(s) {
  const d = parseISO(s);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  const target = new Date(Date.UTC(y, m + 4, day));
  if (target.getUTCDate() !== day) return iso(new Date(Date.UTC(y, m + 5, 1)));
  return iso(target);
}

export function daysBetween(from, to) {
  return Math.round((parseISO(to) - parseISO(from)) / 86400000);
}

export function todayISO(now = new Date()) {
  return iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function pretty(s) {
  const d = parseISO(s);
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Every date written in a letter, in order of appearance, as {iso, index, raw}.
export function findDates(text) {
  const out = [];
  const push = (y, mo, d, index, raw) => {
    if (y < 100) y += 2000;
    const s = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (parseISO(s) && y >= 2000 && y <= 2100) out.push({ iso: s, index, raw });
  };
  let m;
  const named = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  while ((m = named.exec(text))) push(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2], m.index, m[0]);
  const num = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
  while ((m = num.exec(text))) push(+m[3], +m[1], +m[2], m.index, m[0]);
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = isoRe.exec(text))) push(+m[1], +m[2], +m[3], m.index, m[0]);
  return out.sort((a, b) => a.index - b.index);
}
