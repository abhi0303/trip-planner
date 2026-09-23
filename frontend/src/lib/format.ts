import type { Currency } from '@/api/types';

/**
 * Amounts are plain numbers in major units — 50000 is ₹50,000, not ₹500.
 * The currency travels on the trip, not on the viewer, so always pass the
 * trip's currency rather than a locale default.
 *
 * Returns null when the amount is null, which means the traveller hid their
 * spending. Callers render "Hidden" — never ₹0.
 */
export function money(amount: number | null | undefined, currency: string = 'INR'): string | null {
  if (amount === null || amount === undefined) return null;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

/** Compact form for cards and chips: ₹50k, ₹1.2L, $12k. */
export function moneyShort(amount: number | null | undefined, currency: string = 'INR'): string | null {
  if (amount === null || amount === undefined) return null;
  const symbol = CURRENCY_SYMBOL[currency as Currency] ?? '';

  if (currency === 'INR') {
    if (amount >= 1e7) return `${symbol}${trim(amount / 1e7)}Cr`;
    if (amount >= 1e5) return `${symbol}${trim(amount / 1e5)}L`;
    if (amount >= 1000) return `${symbol}${trim(amount / 1000)}k`;
    return `${symbol}${Math.round(amount)}`;
  }
  if (amount >= 1e6) return `${symbol}${trim(amount / 1e6)}M`;
  if (amount >= 1000) return `${symbol}${trim(amount / 1000)}k`;
  return `${symbol}${Math.round(amount)}`;
}

const trim = (value: number) => (value < 10 ? value.toFixed(1).replace(/\.0$/, '') : String(Math.round(value)));

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', THB: '฿',
  AUD: 'A$', JPY: '¥', LKR: 'Rs', NPR: 'Rs', IDR: 'Rp', MYR: 'RM', VND: '₫',
};

// --------------------------------------------------------------------- dates

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-08-12` -> `12 Aug 2026`. Parsed as UTC so it never shifts a day. */
export function formatDate(value: string | null | undefined, withYear = true): string {
  if (!value) return '';
  const date = parseDate(value);
  if (!date) return '';
  const base = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return withYear ? `${base} ${date.getUTCFullYear()}` : base;
}

/** `12 – 15 Aug 2026`, collapsing the parts the two dates share. */
export function formatDateRange(start: string, end: string): string {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return '';

  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();

  if (sameMonth) {
    return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${formatDate(start, false)} – ${formatDate(end, false)} ${b.getUTCFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `<input type="date">` only accepts a bare `YYYY-MM-DD`. The API documents its
 * date fields as `format: date` but actually returns full ISO timestamps
 * (`2026-08-12T00:00:00.000Z`), which the input rejects silently — it just
 * renders empty. Every date that populates an input goes through this.
 */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : '';
}

/** "3 nights · 4 days" — both values come from the server, never computed here. */
export function duration(nights: number, days: number): string {
  const n = `${nights} ${nights === 1 ? 'night' : 'nights'}`;
  const d = `${days} ${days === 1 ? 'day' : 'days'}`;
  return `${n} · ${d}`;
}

export function travelers(count: number): string {
  return `${count} ${count === 1 ? 'traveller' : 'travellers'}`;
}

/** Relative time for feed items: "2h", "3d", then a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, (Date.now() - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
  return formatDate(iso);
}

/** 240 -> "4h", 90 -> "1h 30m". */
export function minutes(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const h = Math.floor(value / 60);
  const m = Math.round(value % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function compactCount(value: number): string {
  if (value >= 1e6) return `${trim(value / 1e6)}M`;
  if (value >= 1000) return `${trim(value / 1000)}k`;
  return String(value);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
