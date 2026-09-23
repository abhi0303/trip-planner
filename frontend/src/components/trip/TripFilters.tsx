import { useState } from 'react';
import { cn } from '@/lib/cn';
import { TRAVEL_STYLE, type TravelStyle, type TripFilters, type TripSort } from '@/api/types';
import { styleMeta } from '@/lib/labels';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Bits';
import { Field, MoneyInput, NumberInput } from '@/components/ui/Field';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';

const SORTS: Array<{ value: TripSort; label: string }> = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most saved' },
  { value: 'budget_low', label: 'Cheapest first' },
  { value: 'budget_high', label: 'Priciest first' },
  { value: 'oldest', label: 'Oldest first' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The Budget Explorer. Every control maps to a query param on GET /trips —
 * budget, duration, party size, month and travel style are all server-side.
 */
export function TripFilterBar({
  value, onChange,
}: {
  value: TripFilters;
  onChange: (filters: TripFilters) => void;
}) {
  const [open, setOpen] = useState(false);

  const set = <K extends keyof TripFilters>(key: K, next: TripFilters[K]) =>
    onChange({ ...value, [key]: next });

  const toggleStyle = (style: TravelStyle) => {
    const current = value.travelStyles ?? [];
    const next = current.includes(style) ? current.filter((s) => s !== style) : [...current, style];
    set('travelStyles', next.length ? next : undefined);
  };

  const activeCount = [
    value.minBudget, value.maxBudget, value.minDays, value.maxDays,
    value.travelerCount, value.month, value.travelStyles?.length,
  ].filter(Boolean).length;

  const clear = () => onChange({ sort: value.sort });

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activeCount ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setOpen((current) => !current)}
        >
          <Icon name="settings" size={15} />
          Filters
          {activeCount > 0 && <span className="tnum ml-0.5">({activeCount})</span>}
        </Button>

        <Dropdown<TripSort>
          size="sm"
          value={value.sort ?? 'recent'}
          onChange={(sort) => set('sort', sort)}
          options={SORTS}
          className="w-auto min-w-[150px]"
        />

        {activeCount > 0 && (
          <button onClick={clear} className="text-[13px] font-medium text-ink-faint hover:text-ink">
            Clear
          </button>
        )}
      </div>

      <div className={cn('grid transition-all duration-200', open ? 'grid-rows-[1fr] pt-4' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="space-y-4 rounded-card border border-line-soft bg-surface p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Budget from">
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={value.minBudget ?? ''}
                    placeholder="0"
                    onChange={(event) => set('minBudget', event.target.value ? Number(event.target.value) : undefined)}
                  />
                )}
              </Field>
              <Field label="Budget up to">
                {(id) => (
                  <MoneyInput
                    id={id}
                    value={value.maxBudget ?? ''}
                    placeholder="30000"
                    onChange={(event) => set('maxBudget', event.target.value ? Number(event.target.value) : undefined)}
                  />
                )}
              </Field>

              <Field label="Duration">
                {() => (
                  <div className="flex items-center gap-2">
                    <NumberInput
                      min={1}
                      placeholder="min"
                      value={value.minDays ?? ''}
                      onChange={(event) => set('minDays', event.target.value ? Number(event.target.value) : undefined)}
                      aria-label="Minimum days"
                    />
                    <span className="text-ink-faint">–</span>
                    <NumberInput
                      min={1}
                      placeholder="max"
                      value={value.maxDays ?? ''}
                      onChange={(event) => set('maxDays', event.target.value ? Number(event.target.value) : undefined)}
                      aria-label="Maximum days"
                    />
                  </div>
                )}
              </Field>

              <Field label="Travellers">
                {(id) => (
                  <Dropdown
                    id={id}
                    value={value.travelerCount ? String(value.travelerCount) : 'any'}
                    onChange={(next) => set('travelerCount', next === 'any' ? undefined : Number(next))}
                    options={[
                      { value: 'any', label: 'Any group size' },
                      ...[1, 2, 3, 4, 5, 6].map((count) => ({
                        value: String(count),
                        label: `${count}${count === 6 ? '+' : ''} ${count === 1 ? 'traveller' : 'travellers'}`,
                      })),
                    ]}
                  />
                )}
              </Field>
            </div>

            <Field label="Month they travelled" hint="seasonal comparison">
              {() => (
                <div className="flex flex-wrap gap-1.5">
                  {MONTHS.map((label, index) => (
                    <Chip
                      key={label}
                      active={value.month === index + 1}
                      onClick={() => set('month', value.month === index + 1 ? undefined : index + 1)}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Travel style">
              {() => (
                <div className="flex flex-wrap gap-1.5">
                  {TRAVEL_STYLE.map((style) => {
                    const meta = styleMeta(style);
                    return (
                      <Chip
                        key={style}
                        active={value.travelStyles?.includes(style)}
                        onClick={() => toggleStyle(style)}
                      >
                        <Icon name={meta.icon} size={14} />
                        {meta.label}
                      </Chip>
                    );
                  })}
                </div>
              )}
            </Field>
          </div>
        </div>
      </div>

      {/* Budget filters can only match trips whose spending is public. */}
      {(value.minBudget !== undefined || value.maxBudget !== undefined) && (
        <p className="mt-2.5 flex items-start gap-1.5 text-xs text-ink-faint">
          <Icon name="lock" size={13} className="mt-px shrink-0" />
          Budget filters only match trips whose spending is public, so this shows
          fewer results than an unfiltered search.
        </p>
      )}
    </div>
  );
}
