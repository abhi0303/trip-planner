import { toDateInput } from '@/lib/format';
import type { TripDay, TripPlace } from '@/api/types';

/**
 * A single moment a place was visited. Either read off the itinerary (which is
 * where the API keeps clock times) or, failing that, off the trip place's own
 * `visitDate` — that column is `format: date`, so it can never carry a time.
 */
export interface PlaceVisit {
  dayNumber: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  /** The activity that produced it, when the visit came from the itinerary. */
  label: string | null;
}

const DAY_MS = 86_400_000;

/** Day 1 is the start date. Null when either date is missing or unparseable. */
export function dayNumberFor(startDate: string | null | undefined, date: string | null | undefined): number | null {
  const from = toDateInput(startDate);
  const on = toDateInput(date);
  if (!from || !on) return null;
  const diff = Math.round((Date.parse(`${on}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
  return Number.isFinite(diff) ? diff + 1 : null;
}

/** "09:30 – 12:00", "from 09:30", "until 12:00", or null. */
export function timeRange(start: string | null, end: string | null): string | null {
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return `until ${end}`;
  return null;
}

/** Sorts nulls last, so a timed visit always outranks an untimed one. */
function byDayThenTime(a: PlaceVisit, b: PlaceVisit): number {
  const day = (a.dayNumber ?? Infinity) - (b.dayNumber ?? Infinity);
  if (day) return day;
  return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99');
}

/**
 * Every time this place appears in the day-by-day plan, in order. Falls back to
 * the single `visitDate` on the trip place when the itinerary says nothing
 * about it, so a trip with no itinerary still shows a date.
 */
export function placeVisits(
  trip: { startDate: string; itinerary: TripDay[] },
  entry: TripPlace,
): PlaceVisit[] {
  const fromItinerary: PlaceVisit[] = [];

  for (const day of trip.itinerary) {
    for (const activity of day.activities) {
      if (activity.place?.id !== entry.place.id) continue;
      fromItinerary.push({
        dayNumber: day.dayNumber,
        date: day.date ?? null,
        startTime: activity.startTime,
        endTime: activity.endTime,
        label: activity.title,
      });
    }
  }

  if (fromItinerary.length) return fromItinerary.sort(byDayThenTime);

  if (entry.visitDate) {
    return [{
      dayNumber: dayNumberFor(trip.startDate, entry.visitDate),
      date: entry.visitDate,
      startTime: null,
      endTime: null,
      label: null,
    }];
  }

  return [];
}
