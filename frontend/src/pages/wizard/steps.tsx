import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { duration, formatDate, minutes, money, toDateInput } from '@/lib/format';
import { timeRange } from '@/lib/itinerary';
import {
  ACTIVITY_KIND_META, CROWD_META, SEASON_META, VISIBILITY_META, WEATHER_META,
  activityMeta, categoryMeta, criteriaLabel, isCoverPhoto, placeIcon, styleMeta,
} from '@/lib/labels';
import {
  ACTIVITY_KIND, CROWD_LEVEL, CURRENCY, EXPENSE_CATEGORY, TRAVEL_STYLE, VISIBILITY, WEATHER,
  type ActivityKind, type CreateTripBody, type ExpenseInput, type RatingCriteria,
  type RatingType, type StayInput, type TripDetail, type TripMeta, type Visibility,
} from '@/api/types';
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/Field';
import { Dropdown } from '@/components/ui/Dropdown';
import { COUNTRIES } from '@/lib/countries';
import { Button, Spinner } from '@/components/ui/Button';
import { Badge, Chip, StarPicker } from '@/components/ui/Bits';
import { Icon, IconTile } from '@/components/ui/Icon';
import { PlacePicker } from './PlacePicker';
import { ImageCropper } from '@/components/ui/ImageCropper';


// -------------------------------------------------------- 1. destination

export function StepDestination({
  draft, onChange,
}: {
  draft: Partial<CreateTripBody>;
  onChange: (patch: Partial<CreateTripBody>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Country" required>
        {(id) => (
          <Dropdown
            id={id}
            searchable
            placeholder="Choose a country"
            value={draft.countryCode}
            onChange={(code) => {
              const country = COUNTRIES.find((c) => c.code === code);
              onChange({ countryCode: country?.code, country: country?.name, destinationId: undefined });
            }}
            options={COUNTRIES.map((country) => ({
              value: country.code,
              label: country.name,
            }))}
          />
        )}
      </Field>

      <Field label="State or region" hint="optional">
        {(id) => (
          <Input
            id={id}
            value={draft.state ?? ''}
            onChange={(event) => onChange({ state: event.target.value })}
            placeholder="Goa"
          />
        )}
      </Field>

      <Field label="Destination" hint="where you actually went" required>
        {(id) => (
          <Input
            id={id}
            value={draft.destination ?? ''}
            onChange={(event) => onChange({ destination: event.target.value })}
            placeholder="South Goa"
            required
          />
        )}
      </Field>

      {draft.countryCode && (
        <Field
          label="Link to a known destination"
          hint="optional — powers discovery"
        >
          {() => (
            <>
              {draft.destinationId ? (
                <div className="flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5">
                  <Icon name="pin" size={15} className="text-brand" />
                  <span className="flex-1 text-sm font-medium">{draft.destination}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ destinationId: undefined })}
                    className="text-xs font-medium text-ink-faint hover:text-ink"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <PlacePicker
                  destinationsOnly
                  country={{ countryCode: draft.countryCode!, country: draft.country!, state: draft.state }}
                  placeholder="Search destinations…"
                  onPick={(place) => onChange({ destinationId: place.id, destination: draft.destination || place.name })}
                />
              )}
            </>
          )}
        </Field>
      )}

      <Field label="Trip title" required>
        {(id) => (
          <Input
            id={id}
            value={draft.title ?? ''}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="South Goa in monsoon"
            maxLength={120}
            required
          />
        )}
      </Field>
    </div>
  );
}

// -------------------------------------------------------------- 2. dates

export function StepDates({
  draft, onChange, derived,
}: {
  draft: Partial<CreateTripBody>;
  onChange: (patch: Partial<CreateTripBody>) => void;
  derived?: { nights: number; days: number; season: string | null };
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" required>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={toDateInput(draft.startDate)}
              onChange={(event) => onChange({ startDate: event.target.value })}
              required
            />
          )}
        </Field>
        <Field label="End date" required>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={toDateInput(draft.endDate)}
              min={toDateInput(draft.startDate)}
              onChange={(event) => onChange({ endDate: event.target.value })}
              required
            />
          )}
        </Field>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-sunk px-3.5 py-2.5 text-[13px] text-ink-soft">
        <Icon name="clock" size={15} className="mt-0.5 shrink-0" />
        {derived
          ? <span>
              <strong className="text-ink">{duration(derived.nights, derived.days)}</strong>
              {derived.season && ` · ${SEASON_META[derived.season as keyof typeof SEASON_META]?.label ?? derived.season}`}
              {' — worked out from your dates.'}
            </span>
          : 'Nights, days and season are worked out from these dates once you save.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------- 3. travellers

export function StepTravelers({
  draft, onChange,
}: {
  draft: Partial<CreateTripBody>;
  onChange: (patch: Partial<CreateTripBody>) => void;
}) {
  const rows = [
    { key: 'adults' as const, label: 'Adults', min: 1 },
    { key: 'children' as const, label: 'Children', min: 0 },
    { key: 'infants' as const, label: 'Infants', min: 0 },
  ];
  const total = (draft.adults ?? 1) + (draft.children ?? 0) + (draft.infants ?? 0);

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const value = draft[row.key] ?? (row.key === 'adults' ? 1 : 0);
        return (
          <div key={row.key} className="flex items-center justify-between rounded-xl border border-line-soft bg-surface px-4 py-3">
            <span className="text-sm font-medium">{row.label}</span>
            <div className="flex items-center gap-3">
              <Stepper
                value={value}
                min={row.min}
                onChange={(next) => onChange({ [row.key]: next } as Partial<CreateTripBody>)}
                label={row.label}
              />
            </div>
          </div>
        );
      })}

      <p className="text-center text-[13px] text-ink-soft tnum">
        {total} {total === 1 ? 'traveller' : 'travellers'} — every per-person figure uses this.
      </p>
    </div>
  );
}

function Stepper({
  value, onChange, min = 0, max = 50, label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer ${label.toLowerCase()}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40"
      >
        −
      </button>
      <span className="tnum w-8 text-center text-sm font-semibold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label.toLowerCase()}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

// --------------------------------------------------------- 4. trip styles

export function StepStyles({
  draft, onChange,
}: {
  draft: Partial<CreateTripBody>;
  onChange: (patch: Partial<CreateTripBody>) => void;
}) {
  const selected = draft.travelStyles ?? [];

  const toggle = (style: (typeof TRAVEL_STYLE)[number]) => {
    const next = selected.includes(style)
      ? selected.filter((s) => s !== style)
      : selected.length < 8 ? [...selected, style] : selected;
    onChange({ travelStyles: next });
  };

  return (
    <div className="space-y-5">
      <Field label="What kind of trip was this?" hint={`${selected.length}/8`}>
        {() => (
          <div className="flex flex-wrap gap-1.5">
            {TRAVEL_STYLE.map((style) => {
              const meta = styleMeta(style);
              return (
                <Chip key={style} active={selected.includes(style)} onClick={() => toggle(style)}>
                  <Icon name={meta.icon} size={14} /> {meta.label}
                </Chip>
              );
            })}
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Weather" hint="optional">
          {(id) => (
            <Dropdown
              id={id}
              placeholder="Not recorded"
              value={draft.weather ?? 'none'}
              onChange={(next) => onChange({ weather: (next === 'none' ? undefined : next) as never })}
              options={[
                { value: 'none', label: 'Not recorded' },
                ...WEATHER.map((value) => ({
                  value, label: WEATHER_META[value].label, icon: WEATHER_META[value].icon,
                })),
              ]}
            />
          )}
        </Field>

        <Field label="How busy was it?" hint="optional">
          {(id) => (
            <Dropdown
              id={id}
              placeholder="Not recorded"
              value={draft.crowdLevel ?? 'none'}
              onChange={(next) => onChange({ crowdLevel: (next === 'none' ? undefined : next) as never })}
              options={[
                { value: 'none', label: 'Not recorded' },
                ...CROWD_LEVEL.map((value) => ({
                  value, label: CROWD_META[value].label, hint: '▮'.repeat(CROWD_META[value].bars),
                })),
              ]}
            />
          )}
        </Field>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- 5. places

/**
 * Visit date and time spent, saved on blur. The API stores `visitDate` as a
 * plain date — clock times live on itinerary activities, one step along.
 */
function PlaceSchedule({
  entry, trip, onUpdate, busy,
}: {
  entry: TripDetail['places'][number];
  trip: TripDetail;
  onUpdate: (tripPlaceId: string, body: { visitDate?: string; durationMinutes?: number }) => void;
  busy?: boolean;
}) {
  const [date, setDate] = useState(toDateInput(entry.visitDate));
  const [hours, setHours] = useState(
    entry.durationMinutes === null ? '' : String(Math.round((entry.durationMinutes / 60) * 10) / 10),
  );

  // The row re-renders from the server after every save; keep it in step
  // without clobbering what is being typed.
  useEffect(() => { setDate(toDateInput(entry.visitDate)); }, [entry.visitDate]);

  const saveDate = () => {
    const next = date || undefined;
    if (next === (toDateInput(entry.visitDate) || undefined)) return;
    if (next) onUpdate(entry.id, { visitDate: next });
  };

  const saveHours = () => {
    const parsed = Number(hours);
    if (!hours.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    const value = Math.min(Math.round(parsed * 60), 20160);
    if (value === entry.durationMinutes) return;
    onUpdate(entry.id, { durationMinutes: value });
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line-soft pt-2">
      <label className="flex items-center gap-1.5 text-2xs text-ink-faint">
        <Icon name="calendar" size={12} />
        <input
          type="date"
          value={date}
          min={toDateInput(trip.startDate)}
          max={toDateInput(trip.endDate)}
          disabled={busy}
          onChange={(event) => setDate(event.target.value)}
          onBlur={saveDate}
          className="rounded-lg border border-line-soft bg-ground px-2 py-1 text-xs text-ink tnum focus:border-brand focus:outline-none"
        />
      </label>

      <label className="flex items-center gap-1.5 text-2xs text-ink-faint">
        <Icon name="clock" size={12} />
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          placeholder="Hours"
          value={hours}
          disabled={busy}
          onChange={(event) => setHours(event.target.value)}
          onBlur={saveHours}
          className="w-[72px] rounded-lg border border-line-soft bg-ground px-2 py-1 text-xs text-ink tnum focus:border-brand focus:outline-none"
        />
        <span>hrs here</span>
      </label>
    </div>
  );
}

export function StepPlaces({
  trip, onAdd, onRemove, onReorder, onUpdate, busy,
}: {
  trip: TripDetail;
  onAdd: (placeId: string) => void;
  onRemove: (tripPlaceId: string) => void;
  onReorder: (ids: string[]) => void;
  onUpdate: (tripPlaceId: string, body: { visitDate?: string; durationMinutes?: number }) => void;
  busy?: boolean;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const next = [...trip.places];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map((entry) => entry.id));
  };

  return (
    <div className="space-y-4">
      <PlacePicker
        country={{ countryCode: trip.countryCode, country: trip.country, state: trip.state ?? undefined }}
        onPick={(place) => onAdd(place.id)}
        placeholder="Search or add a place you visited…"
      />

      {trip.places.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-soft">
          Add the places you actually went, then give each one a date. These link to
          real place pages, which is what lets other travellers follow your route.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {trip.places.map((entry, index) => (
            <li
              key={entry.id}
              className="rounded-xl border border-line-soft bg-surface px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
              <span className="tnum w-5 shrink-0 text-center text-xs font-semibold text-ink-faint">{index + 1}</span>
              <IconTile name={placeIcon(entry.place.category)} size="sm" tone="neutral" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{entry.place.name}</span>
                <span className="block truncate text-2xs text-ink-faint">{entry.place.country}</span>
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button" onClick={() => move(index, -1)} disabled={index === 0 || busy}
                  aria-label="Move up"
                  className="rounded p-1 text-ink-faint hover:bg-sunk hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevronDown" size={15} className="rotate-180" />
                </button>
                <button
                  type="button" onClick={() => move(index, 1)} disabled={index === trip.places.length - 1 || busy}
                  aria-label="Move down"
                  className="rounded p-1 text-ink-faint hover:bg-sunk hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevronDown" size={15} />
                </button>
                <button
                  type="button" onClick={() => onRemove(entry.id)} disabled={busy}
                  aria-label={`Remove ${entry.place.name}`}
                  className="rounded p-1 text-ink-faint hover:bg-danger-soft hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
              </div>

              <PlaceSchedule entry={entry} trip={trip} onUpdate={onUpdate} busy={busy} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ----------------------------------------------------- 6. day by day

/** Day 1 is the start date; the API derives the same thing server-side. */
function dateForDay(startDate: string | undefined, dayNumber: number): string {
  const from = toDateInput(startDate);
  if (!from) return '';
  const at = new Date(`${from}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + dayNumber - 1);
  return at.toISOString().slice(0, 10);
}

const EMPTY_ACTIVITY = { title: '', kind: 'SIGHTSEEING' as ActivityKind, placeId: '', startTime: '', endTime: '' };

export function StepItinerary({
  trip, onSaveDay, onAddActivity, onRemoveActivity, busy,
}: {
  trip: TripDetail;
  onSaveDay: (dayNumber: number, body: { title?: string; summary?: string }) => void;
  onAddActivity: (dayNumber: number, body: {
    title: string; kind: ActivityKind; placeId?: string; startTime?: string; endTime?: string;
  }) => void;
  onRemoveActivity: (activityId: string) => void;
  busy?: boolean;
}) {
  const dayCount = Math.max(
    trip.days || 1,
    ...trip.itinerary.map((day) => day.dayNumber),
    1,
  );
  const [selected, setSelected] = useState(1);
  const [form, setForm] = useState(EMPTY_ACTIVITY);

  const day = trip.itinerary.find((entry) => entry.dayNumber === selected);
  const [title, setTitle] = useState(day?.title ?? '');
  const [summary, setSummary] = useState(day?.summary ?? '');

  // Switching days, or a save coming back, reloads the two free-text fields.
  useEffect(() => {
    setTitle(day?.title ?? '');
    setSummary(day?.summary ?? '');
  }, [day?.id, day?.title, day?.summary]);

  const saveDay = () => {
    if ((title.trim() || '') === (day?.title ?? '') && (summary.trim() || '') === (day?.summary ?? '')) return;
    if (!title.trim() && !summary.trim()) return;
    onSaveDay(selected, {
      title: title.trim().slice(0, 120) || undefined,
      summary: summary.trim().slice(0, 1000) || undefined,
    });
  };

  const submit = () => {
    if (!form.title.trim()) return;
    onAddActivity(selected, {
      title: form.title.trim().slice(0, 150),
      kind: form.kind,
      placeId: form.placeId || undefined,
      // Some browsers hand back HH:mm:ss; the API validates HH:mm exactly.
      startTime: form.startTime ? form.startTime.slice(0, 5) : undefined,
      endTime: form.endTime ? form.endTime.slice(0, 5) : undefined,
    });
    setForm(EMPTY_ACTIVITY);
  };

  const activities = day?.activities ?? [];

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {Array.from({ length: dayCount }, (_, index) => index + 1).map((dayNumber) => {
          const existing = trip.itinerary.find((entry) => entry.dayNumber === dayNumber);
          const filled = (existing?.activities.length ?? 0) > 0;
          return (
            <button
              key={dayNumber}
              type="button"
              onClick={() => setSelected(dayNumber)}
              className={cn(
                'flex shrink-0 flex-col items-start rounded-xl border px-3 py-1.5 text-left transition',
                dayNumber === selected
                  ? 'border-transparent bg-ink text-ground'
                  : 'border-line-soft bg-surface text-ink-soft hover:border-line',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold tnum">
                Day {dayNumber}
                {filled && (
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', dayNumber === selected ? 'bg-ground' : 'bg-brand')}
                    aria-label="has activities"
                  />
                )}
              </span>
              <span className="text-2xs tnum opacity-70">
                {formatDate(existing?.date ?? dateForDay(trip.startDate, dayNumber)) ?? ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Day title" hint="optional">
          {(id) => (
            <Input
              id={id}
              value={title}
              placeholder={`Day ${selected}`}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveDay}
            />
          )}
        </Field>
        <Field label="How the day went" hint="optional">
          {(id) => (
            <Input
              id={id}
              value={summary}
              placeholder="One line, if it needs one"
              onChange={(event) => setSummary(event.target.value)}
              onBlur={saveDay}
            />
          )}
        </Field>
      </div>

      {activities.length > 0 && (
        <ul className="space-y-1.5">
          {activities.map((activity) => {
            const meta = activityMeta(activity.kind);
            return (
              <li
                key={activity.id}
                className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-surface px-3 py-2.5"
              >
                <span className="tnum w-[52px] shrink-0 text-xs font-semibold text-ink-faint">
                  {activity.startTime ?? '—'}
                </span>
                <IconTile name={meta.icon} size="sm" tone="neutral" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{activity.title}</span>
                  <span className="block truncate text-2xs text-ink-faint">
                    {[activity.place?.name ?? meta.label,
                      activity.endTime ? timeRange(activity.startTime, activity.endTime) : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveActivity(activity.id)}
                  disabled={busy}
                  aria-label={`Remove ${activity.title}`}
                  className="shrink-0 rounded p-1 text-ink-faint hover:bg-danger-soft hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3 rounded-xl border border-dashed border-line p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="What did you do?" required>
            {(id) => (
              <Input
                id={id}
                value={form.title}
                maxLength={150}
                placeholder="Sunset at the north end"
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            )}
          </Field>
          <Field label="Kind">
            {(id) => (
              <Dropdown
                id={id}
                value={form.kind}
                onChange={(next) => setForm({ ...form, kind: next as ActivityKind })}
                options={ACTIVITY_KIND.map((value) => ({
                  value, label: ACTIVITY_KIND_META[value].label, icon: ACTIVITY_KIND_META[value].icon,
                }))}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
          <Field label="Where" hint={trip.places.length ? 'optional' : 'add places first'}>
            {(id) => (
              <Dropdown
                id={id}
                placeholder={trip.places.length ? 'No particular place' : 'No places added yet'}
                value={form.placeId || 'none'}
                onChange={(next) => setForm({ ...form, placeId: next === 'none' ? '' : next })}
                options={[
                  { value: 'none', label: 'No particular place' },
                  ...trip.places.map((entry) => ({
                    value: entry.place.id,
                    label: entry.place.name,
                    icon: placeIcon(entry.place.category),
                  })),
                ]}
              />
            )}
          </Field>
          <Field label="From" hint="optional">
            {(id) => (
              <input
                id={id}
                type="time"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                className="h-11 w-full rounded-xl border border-line bg-ground px-3 text-sm text-ink tnum focus:border-brand focus:outline-none"
              />
            )}
          </Field>
          <Field label="To" hint="optional">
            {(id) => (
              <input
                id={id}
                type="time"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                className="h-11 w-full rounded-xl border border-line bg-ground px-3 text-sm text-ink tnum focus:border-brand focus:outline-none"
              />
            )}
          </Field>
        </div>

        <Button variant="secondary" onClick={submit} disabled={!form.title.trim() || busy} className="w-full sm:w-auto">
          <Icon name="plus" size={16} /> Add to day {selected}
        </Button>
      </div>

      <p className="text-2xs leading-relaxed text-ink-faint">
        Times here are what show up next to each place on the trip page, so other
        travellers can follow the same day in the same order.
      </p>
    </div>
  );
}

// ------------------------------------------------------------ 7. expenses

export function StepExpenses({
  trip, meta, mode, total: typedTotal, lines, onLinesChange, onModeChange, onTotalChange,
}: {
  trip: TripDetail;
  meta: TripMeta | undefined;
  mode: 'TOTAL' | 'DETAILED';
  total: number | undefined;
  lines: ExpenseInput[];
  onLinesChange: (lines: ExpenseInput[]) => void;
  onModeChange: (mode: 'TOTAL' | 'DETAILED') => void;
  onTotalChange: (total: number | undefined) => void;
}) {
  const detailed = mode === 'DETAILED';
  const total = detailed
    ? lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
    : typedTotal ?? trip.totalExpense ?? 0;

  const perPerson = trip.travelerCount > 0 ? total / trip.travelerCount : 0;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <ModeCard
          active={!detailed}
          title="One total"
          body="Just the number you remember."
          onClick={() => onModeChange('TOTAL')}
        />
        <ModeCard
          active={detailed}
          title="Line by line"
          body="Gives you the category breakdown."
          onClick={() => onModeChange('DETAILED')}
        />
      </div>

      <p className="text-[13px] text-ink-soft">
        Amounts are in <span className="font-semibold text-ink">{trip.currency}</span>,
        set when the trip was created.
      </p>

      {detailed ? (
        <ExpenseLines lines={lines} meta={meta} currency={trip.currency} onChange={onLinesChange} />
      ) : (
        <Field label="Total trip expense">
          {(id) => (
            <MoneyInput
              id={id}
              value={typedTotal ?? trip.totalExpense ?? ''}
              placeholder="50000"
              onChange={(event) => onTotalChange(event.target.value ? Number(event.target.value) : undefined)}
            />
          )}
        </Field>
      )}

      {total > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line-soft bg-line-soft">
          <div className="bg-surface p-3">
            <p className="eyebrow mb-1">Total</p>
            <p className="tnum text-lg font-semibold">{money(total, trip.currency)}</p>
          </div>
          <div className="bg-ember-soft p-3">
            <p className="eyebrow mb-1">Per person</p>
            <p className="tnum text-lg font-semibold text-ember">{money(perPerson, trip.currency)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeCard({
  active, title, body, onClick,
}: { active: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-xl border p-3.5 text-left transition-colors',
        active ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-ink-faint',
      )}
    >
      <span className={cn('block text-sm font-semibold', active && 'text-brand')}>{title}</span>
      <span className="mt-0.5 block text-xs text-ink-soft">{body}</span>
    </button>
  );
}

function ExpenseLines({
  lines, meta, currency, onChange,
}: {
  lines: ExpenseInput[];
  meta: TripMeta | undefined;
  currency: string;
  onChange: (lines: ExpenseInput[]) => void;
}) {
  const update = (index: number, patch: Partial<ExpenseInput>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Subcategories are validated against their category server-side.
        const subcategories = meta?.expenseSubcategories?.[line.category] ?? [];
        return (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1.2fr_1.2fr_1fr_auto]">
            <Dropdown
              size="sm"
              value={line.category}
              onChange={(category) => update(index, { category: category as never, subcategory: undefined })}
              options={EXPENSE_CATEGORY.map((category) => ({
                value: category,
                label: categoryMeta(category).label,
                icon: categoryMeta(category).icon,
              }))}
            />

            <Dropdown
              size="sm"
              value={line.subcategory ?? 'any'}
              onChange={(sub) => update(index, { subcategory: sub === 'any' ? undefined : sub })}
              options={[
                { value: 'any', label: 'Any' },
                ...subcategories.map((sub) => ({
                  value: sub,
                  label: sub.toLowerCase().replace(/_/g, ' '),
                })),
              ]}
            />

            <MoneyInput
              value={line.amount || ''}
              onChange={(event) => update(index, { amount: Number(event.target.value) || 0 })}
              aria-label="Amount"
              symbol={currency === 'INR' ? '₹' : ''}
              className="h-10 text-[13px]"
            />

            <button
              type="button"
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
              aria-label="Remove line"
              className="flex h-10 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-danger-soft hover:text-danger"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...lines, { category: 'FOOD', amount: 0 }])}
      >
        <Icon name="plus" size={15} /> Add a line
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- 8. stay

export function StepStay({
  trip, onAdd, onRemove,
}: {
  trip: TripDetail;
  onAdd: (stay: StayInput) => Promise<void>;
  onRemove: (stayId: string) => void;
}) {
  const [form, setForm] = useState<StayInput>({ hotelName: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.hotelName.trim()) return;
    setBusy(true);
    try {
      await onAdd(form);
      setForm({ hotelName: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {trip.stays.length > 0 && (
        <ul className="space-y-1.5">
          {trip.stays.map((stay) => (
            <li key={stay.id} className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface px-3.5 py-2.5">
              <Icon name="bed" size={17} className="shrink-0 text-ink-faint" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{stay.hotelName}</span>
                <span className="tnum block text-2xs text-ink-faint">
                  {stay.nights !== null ? `${stay.nights} nights` : 'Dates not set'}
                  {stay.amount !== null && ` · ${money(stay.amount, stay.currency)}`}
                </span>
              </span>
              <button
                type="button" onClick={() => onRemove(stay.id)} aria-label={`Remove ${stay.hotelName}`}
                className="shrink-0 rounded p-1 text-ink-faint hover:bg-danger-soft hover:text-danger"
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-3 rounded-card border border-line-soft bg-surface p-4">
        <Field label="Hotel or stay name" required>
          {(id) => (
            <Input
              id={id}
              value={form.hotelName}
              onChange={(event) => setForm((f) => ({ ...f, hotelName: event.target.value }))}
              placeholder="Monsoon Agonda"
            />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Check in">
            {(id) => (
              <Input id={id} type="date" value={toDateInput(form.checkIn)}
                onChange={(event) => setForm((f) => ({ ...f, checkIn: event.target.value || undefined }))} />
            )}
          </Field>
          <Field label="Check out">
            {(id) => (
              <Input id={id} type="date" value={toDateInput(form.checkOut)} min={toDateInput(form.checkIn)}
                onChange={(event) => setForm((f) => ({ ...f, checkOut: event.target.value || undefined }))} />
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What it cost">
            {(id) => (
              <MoneyInput id={id} value={form.amount ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, amount: event.target.value ? Number(event.target.value) : undefined }))} />
            )}
          </Field>
          <Field label="Room type">
            {(id) => (
              <Input id={id} value={form.roomType ?? ''} placeholder="Sea view cottage"
                onChange={(event) => setForm((f) => ({ ...f, roomType: event.target.value || undefined }))} />
            )}
          </Field>
        </div>

        <Field label="Your rating">
          {() => (
            <StarPicker
              value={form.rating}
              onChange={(rating) => setForm((f) => ({ ...f, rating }))}
              label="Stay rating"
            />
          )}
        </Field>

        <Button type="submit" variant="outline" size="sm" loading={busy} disabled={!form.hotelName.trim()}>
          <Icon name="plus" size={15} /> Add this stay
        </Button>
      </form>
    </div>
  );
}

// -------------------------------------------------------------- 9. photos

export function StepPhotos({
  trip, onUpload, uploading, onRemove, onSetCover,
}: {
  trip: TripDetail;
  onUpload: (files: File[]) => void;
  uploading: boolean;
  onRemove: (photoId: string) => Promise<void> | void;
  onSetCover: (photoId: string, mediaId: string) => Promise<void> | void;
}) {
  // Which tile is mid-request, so the spinner lands on the photo acted on
  // rather than only in the global bar.
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const runOnPhoto = async (photoId: string, action: () => Promise<void> | void) => {
    setPendingPhoto(photoId);
    try {
      await action();
    } finally {
      setPendingPhoto(null);
    }
  };
  // Photos are adjusted one at a time before anything uploads. Cropping is
  // optional — a batch of twenty should not force twenty crops — so each can
  // be skipped and goes up untouched.
  const [queue, setQueue] = useState<File[]>([]);
  const [ready, setReady] = useState<File[]>([]);

  const finish = (all: File[]) => {
    setQueue([]);
    setReady([]);
    if (all.length) onUpload(all);
  };

  const advance = (file: File) => {
    const rest = queue.slice(1);
    const done = [...ready, file];
    if (rest.length) {
      setQueue(rest);
      setReady(done);
    } else {
      finish(done);
    }
  };

  return (
    <div className="space-y-4">
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line px-6 py-10 text-center transition-colors',
          'hover:border-brand hover:bg-brand-soft/30',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        {uploading
          ? <Spinner className="h-6 w-6 text-brand" />
          : <Icon name="camera" size={26} className="text-ink-faint" />}
        <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Add photos'}</span>
        <span className="text-xs text-ink-faint">JPEG, PNG, WebP or HEIC · up to 20 at a time</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []).slice(0, 20);
            event.target.value = '';
            if (files.length) {
              setReady([]);
              setQueue(files);
            }
          }}
        />
      </label>

      {queue.length > 0 && (
        <ImageCropper
          key={`${queue[0].name}-${queue.length}`}
          file={queue[0]}
          aspect={4 / 3}
          outputWidth={1600}
          title={queue.length > 1 ? `Adjust photo — ${ready.length + 1} of ${ready.length + queue.length}` : 'Adjust photo'}
          skipLabel="Use original"
          onSkip={() => advance(queue[0])}
          onCancel={() => finish(ready)}
          onConfirm={advance}
        />
      )}

      {trip.photos.length > 0 && (
        <>
          <p className="text-[13px] text-ink-soft">
            Pick which photo leads the trip — it becomes the cover on every card.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {trip.photos.map((photo) => {
              const cover = isCoverPhoto(photo, trip);
              const pending = pendingPhoto === photo.id;

              return (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl bg-sunk',
                    'ring-2 transition-all duration-200 ease-spring',
                    cover ? 'ring-brand' : 'ring-transparent',
                    pending && 'pointer-events-none',
                  )}
                >
                  <img src={photo.media.url} alt="" className="h-full w-full object-cover" loading="lazy" />

                  {pending && (
                    <span className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[1px]">
                      <Spinner className="h-6 w-6 text-white" />
                    </span>
                  )}

                  {cover ? (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-pill bg-brand px-2 py-0.5 text-2xs font-semibold text-white">
                      <Icon name="star" size={10} filled />
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => runOnPhoto(photo.id, () => onSetCover(photo.id, photo.media.id))}
                      className={cn(
                        'absolute inset-x-1.5 bottom-1.5 rounded-pill bg-black/60 py-1 text-2xs font-medium text-white backdrop-blur-sm',
                        'opacity-0 transition-opacity duration-200 hover:bg-black/80',
                        'group-hover:opacity-100 focus-visible:opacity-100',
                      )}
                    >
                      Make cover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => runOnPhoto(photo.id, () => onRemove(photo.id))}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Icon name="x" size={13} strokeWidth={2.4} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------- 10. experience

export function StepExperience({
  draft, onChange,
}: {
  draft: Partial<CreateTripBody>;
  onChange: (patch: Partial<CreateTripBody>) => void;
}) {
  const prompts = [
    { key: 'enjoyedMost' as const, label: 'What did you enjoy most?', placeholder: 'The lagoon behind Cola beach.' },
    { key: 'surprisedBy' as const, label: 'What surprised you?', placeholder: 'How empty everything was in August.' },
    { key: 'wentWrong' as const, label: 'What went wrong?', placeholder: 'Took a sedan to Cola. Should not have.' },
    { key: 'wouldDoDifferently' as const, label: 'What would you do differently?', placeholder: 'Stay in Palolem instead.' },
    { key: 'adviceForTravelers' as const, label: 'What should another traveller know?', placeholder: 'Rent a scooter. Carry cash.' },
  ];

  return (
    <div className="space-y-4">
      <Field label="Tell us about your trip" hint="the part people actually read">
        {(id) => (
          <Textarea
            id={id}
            value={draft.experience ?? ''}
            onChange={(event) => onChange({ experience: event.target.value })}
            placeholder="South Goa was much quieter than North Goa…"
            rows={6}
            maxLength={8000}
          />
        )}
      </Field>

      <p className="text-[13px] text-ink-soft">
        These prompts are optional, but they are what turn a review into something useful.
      </p>

      {prompts.map((prompt) => (
        <Field key={prompt.key} label={prompt.label}>
          {(id) => (
            <Textarea
              id={id}
              value={draft[prompt.key] ?? ''}
              onChange={(event) => onChange({ [prompt.key]: event.target.value } as Partial<CreateTripBody>)}
              placeholder={prompt.placeholder}
              rows={2}
              maxLength={2000}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

// ------------------------------------------------------------- 11. ratings

export function StepRatings({
  trip, meta, onSubmit, onAddRealityCheck, onRemoveRealityCheck,
}: {
  trip: TripDetail;
  meta: TripMeta | undefined;
  onSubmit: (ratingType: RatingType, placeId: string | undefined, scores: Record<string, number>) => void;
  onAddRealityCheck: (text: string, severity: string, placeId?: string) => Promise<void>;
  onRemoveRealityCheck: (id: string) => void;
}) {
  const [target, setTarget] = useState<string>('TRIP');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [checkText, setCheckText] = useState('');
  const [checkSeverity, setCheckSeverity] = useState('WARNING');
  const [savingCheck, setSavingCheck] = useState(false);

  const ratingType: RatingType = target === 'TRIP' ? 'TRIP' : 'PLACE';
  const placeId = target === 'TRIP' ? undefined : target;

  // Only criteria legal for this rating type are offered — the server rejects the rest.
  const criteria = (meta?.ratingCriteria?.[ratingType] ?? []) as RatingCriteria[];

  // Load any scores already saved for the selected target.
  useEffect(() => {
    const existing = trip.ratings.find(
      (group) => group.ratingType === ratingType && (group.place?.id ?? undefined) === placeId,
    );
    setScores(existing?.scores ?? {});
  }, [target, trip.ratings, ratingType, placeId]);

  const filled = Object.keys(scores).length;

  return (
    <div className="space-y-6">
      <div>
        <Field label="What are you rating?">
          {(id) => (
            <Dropdown
              id={id}
              value={target}
              onChange={setTarget}
              options={[
                { value: 'TRIP', label: 'The trip overall', icon: 'compass' as const },
                ...trip.places.map((entry) => ({
                  value: entry.place.id,
                  label: entry.place.name,
                  glyph: placeIcon(entry.place.category),
                })),
              ]}
            />
          )}
        </Field>

        {criteria.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">Loading rating criteria…</p>
        ) : (
          <>
            <ul className="mt-4 space-y-1">
              {criteria.map((criterion) => (
                <li key={criterion} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-sm">{criteriaLabel(criterion)}</span>
                  <StarPicker
                    value={scores[criterion]}
                    onChange={(score) => setScores((current) => ({ ...current, [criterion]: score }))}
                    size={22}
                    label={criteriaLabel(criterion)}
                  />
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={filled === 0}
              onClick={() => onSubmit(ratingType, placeId, scores)}
            >
              Save {filled > 0 ? `${filled} ratings` : 'ratings'}
            </Button>
          </>
        )}
      </div>

      <div className="border-t border-line-soft pt-5">
        <h3 className="text-base font-semibold">Reality check</h3>
        <p className="mb-3 mt-0.5 text-[13px] text-ink-soft">
          Practical things another traveller should know. Not complaints — warnings.
        </p>

        {trip.realityChecks.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {trip.realityChecks.map((check) => (
              <li key={check.id} className="flex items-start gap-2.5 rounded-xl bg-sunk px-3.5 py-3">
                <Icon
                  name={check.severity === 'DANGER' ? 'danger' : check.severity === 'INFO' ? 'info' : 'warning'}
                  size={16}
                  className="mt-px text-ink-faint"
                />
                <span className="flex-1 text-[13px] leading-relaxed">{check.text}</span>
                <button
                  type="button" onClick={() => onRemoveRealityCheck(check.id)} aria-label="Remove"
                  className="shrink-0 rounded p-0.5 text-ink-faint hover:text-danger"
                >
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <Textarea
            value={checkText}
            onChange={(event) => setCheckText(event.target.value)}
            placeholder="The road to Cola is a steep dirt track. Not in a sedan."
            rows={2}
            maxLength={300}
          />
          <div className="flex gap-2">
            <Dropdown
              size="sm"
              value={checkSeverity}
              onChange={setCheckSeverity}
              className="w-auto min-w-[150px]"
              options={[
                { value: 'INFO', label: 'Good to know', icon: 'info' as const },
                { value: 'WARNING', label: 'Heads up', icon: 'warning' as const },
                { value: 'DANGER', label: 'Be careful', icon: 'danger' as const },
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={savingCheck}
              disabled={checkText.trim().length < 3}
              onClick={async () => {
                setSavingCheck(true);
                try {
                  await onAddRealityCheck(checkText.trim(), checkSeverity);
                  setCheckText('');
                } finally {
                  setSavingCheck(false);
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------- 12. privacy/review

export function StepPrivacy({
  draft, onChange,
}: {
  draft: Partial<CreateTripBody>;
  onChange: (patch: Partial<CreateTripBody>) => void;
}) {
  return (
    <div className="space-y-5">
      <VisibilityPicker
        label="Who can see this trip?"
        value={draft.visibility ?? 'PUBLIC'}
        onChange={(visibility) => onChange({ visibility })}
      />

      <VisibilityPicker
        label="Who can see what you spent?"
        hint="A public trip with private spending is a normal choice."
        value={draft.expenseVisibility ?? 'PUBLIC'}
        onChange={(expenseVisibility) => onChange({ expenseVisibility })}
      />
    </div>
  );
}

function VisibilityPicker({
  label, hint, value, onChange,
}: {
  label: string;
  hint?: string;
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium">{label}</legend>
      {hint && <p className="mb-2 mt-0.5 text-xs text-ink-faint">{hint}</p>}
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {VISIBILITY.map((option) => {
          const meta = VISIBILITY_META[option];
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={active}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                active ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-ink-faint',
              )}
            >
              <Icon name={meta.icon} size={17} className={cn('mt-0.5', active ? 'text-brand' : 'text-ink-faint')} />
              <span className="min-w-0">
                <span className={cn('block text-sm font-semibold', active && 'text-brand')}>{meta.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{meta.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
