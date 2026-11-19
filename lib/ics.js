// A calendar file for the filing deadlines: an all-day event on each date, with alerts two weeks
// and three days before. Built where it is used (the browser on /appeal, the server for the packet)
// and never stored: it goes on the person's own calendar.

import { addDays } from "./dates.js";

export function ics(r) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = [];
  for (const d of r.deadlines.filter((d) => d.kind.startsWith("file_") && d.due_date)) {
    const day = d.due_date.replace(/-/g, "");
    const next = addDays(d.due_date, 1).replace(/-/g, "");
    const uid = `${d.kind}-${day}@appeal-the-denial`;
    ev.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:DEADLINE: ${d.label.replace(/[,;]/g, " ")}`, `DESCRIPTION:${d.rule.cite}. Send it well before this date.`,
      "BEGIN:VALARM", "TRIGGER:-P14D", "ACTION:DISPLAY", "DESCRIPTION:Appeal deadline in 2 weeks", "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", "DESCRIPTION:Appeal deadline in 3 days", "END:VALARM", "END:VEVENT");
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//appeal-the-denial//EN", ...ev, "END:VCALENDAR"].join("\r\n");
}
