const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Returns the epoch ms (IST, 2026) of the first day + first time in the string,
 * using 00:00 when no time is given, null when no day can be read (TBA).
 */
export function startsAt(when: string | null | undefined): number | null {
  if (!when || typeof when !== 'string') return null;
  const clean = when.trim();
  if (!clean || clean.toUpperCase() === 'TBA') return null;

  // 1. Time extraction (first HH:MM or H AM/PM in string)
  let hour = 0;
  let minute = 0;

  const timeMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(am|pm))?\b/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else {
    const ampmMatch = clean.match(/\b([1-9]|1[0-2])\s*(am|pm)\b/i);
    if (ampmMatch) {
      hour = parseInt(ampmMatch[1], 10);
      const meridiem = ampmMatch[2].toLowerCase();
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
    }
  }

  // 2. Month extraction (default October = 9 for ATMOS '26)
  const monthMatch = clean.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i);
  let month = monthMatch ? (MONTHS[monthMatch[1].toLowerCase()] ?? 9) : 9;

  // 3. Day extraction (first day of the event)
  let day: number | null = null;

  // Match weekday before day, e.g. "Fri 23 Oct", "Sat 24", "Wed 21"
  const weekdayMatch = clean.match(/(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (weekdayMatch) {
    day = parseInt(weekdayMatch[1], 10);
  } else {
    // Match range before month, e.g. "23–25 Oct", "23-25 Oct"
    const rangeMatch = clean.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–]|and)\s*\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    );
    if (rangeMatch) {
      day = parseInt(rangeMatch[1], 10);
    } else {
      // Match day before month name, e.g. "23 Oct", "25th October"
      const dayMonthMatch = clean.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
      if (dayMonthMatch) {
        day = parseInt(dayMonthMatch[1], 10);
      } else {
        // Match month before day, e.g. "Oct 23"
        const monthDayMatch = clean.match(
          /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
        );
        if (monthDayMatch) {
          day = parseInt(monthDayMatch[1], 10);
        } else {
          // Match slash format, e.g. "24/10"
          const slashMatch = clean.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/);
          if (slashMatch) {
            day = parseInt(slashMatch[1], 10);
            const m = parseInt(slashMatch[2], 10);
            if (m >= 1 && m <= 12) month = m - 1;
          }
        }
      }
    }
  }

  if (day === null || day < 1 || day > 31 || month < 0 || month > 11) {
    return null;
  }

  return Date.UTC(2026, month, day, hour, minute) - IST_OFFSET_MS;
}

/**
 * Returns the IST date `YYYY-MM-DD` of `startsAt(when)`, or null for TBA.
 */
export function dayKey(when: string | null | undefined): string | null {
  const ms = startsAt(when);
  if (ms === null) return null;
  const ist = new Date(ms + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the first `HH:MM` or `HH:MM–HH:MM` range found in the string, else null.
 */
export function timeLabel(when: string | null | undefined): string | null {
  if (!when || typeof when !== 'string') return null;
  const clean = when.trim();
  if (!clean || clean.toUpperCase() === 'TBA') return null;

  // 1. Time range: e.g. "15:00–18:00", "15:00-18:00", "09:00–12:00"
  const rangeMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (rangeMatch) {
    const h1 = rangeMatch[1].padStart(2, '0');
    const m1 = rangeMatch[2];
    const h2 = rangeMatch[3].padStart(2, '0');
    const m2 = rangeMatch[4];
    return `${h1}:${m1}–${h2}:${m2}`;
  }

  // 2. Single time: e.g. "13:00", "00:30"
  const singleMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (singleMatch) {
    const h = singleMatch[1].padStart(2, '0');
    const m = singleMatch[2];
    return `${h}:${m}`;
  }

  return null;
}

