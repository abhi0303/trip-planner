import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { flatten, usePlace, usePlaceExperiences } from '@/api/queries';
import { cn } from '@/lib/cn';
import { compactCount, minutes, money } from '@/lib/format';
import { criteriaLabel, placeIcon, placeLine, severityMeta, styleMeta } from '@/lib/labels';
import { Badge, EmptyState, Skeleton, Stars } from '@/components/ui/Bits';
import { meshGradient } from '@/lib/visual';
import { Icon, IconTile } from '@/components/ui/Icon';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { TripGrid } from '@/components/trip/TripCard';
import type { PlaceAggregates } from '@/api/types';

export function PlacePage() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [month, setMonth] = useState<number | undefined>();

  const place = usePlace(idOrSlug);
  const experiences = usePlaceExperiences(idOrSlug, month);
  const trips = flatten(experiences.data);

  if (place.isLoading) return <PlaceSkeleton />;
  if (place.isError) return <ErrorState error={place.error} onRetry={() => place.refetch()} />;
  if (!place.data) return null;

  const p = place.data;
  const a = p.aggregates;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-8">
        {/* A place without a photo still gets real artwork rather than a grey band. */}
        <div className="relative -mx-4 mb-6 aspect-[21/9] overflow-hidden bg-sunk sm:mx-0 sm:rounded-xl2">
          {p.coverImage ? (
            <img src={p.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundImage: meshGradient(p.id) }} aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ground via-ground/50 to-ground/5" aria-hidden />
        </div>

        <div className="flex items-start gap-4">
          <IconTile name={placeIcon(p.category)} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[38px]">{p.name}</h1>
              {p.isVerified && <Badge tone="ok"><Icon name="verified" size={12} /> Verified</Badge>}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{placeLine(p)}</p>
            {p.parent && (
              <Link to={`/places/${p.parent.slug}`} className="mt-1 inline-block text-[13px] font-medium text-brand hover:underline">
                Part of {p.parent.name}
              </Link>
            )}
          </div>
        </div>

        {p.description && (
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">{p.description}</p>
        )}
      </header>

      <Aggregates aggregates={a} activeMonth={month} onMonthPick={setMonth} />

      {p.realityChecks.length > 0 && (
        <section className="mt-9" aria-labelledby="place-reality">
          <h2 id="place-reality" className="mb-1 text-[22px] font-bold tracking-tight">Before you go</h2>
          <p className="mb-3.5 text-[13px] text-ink-soft">Practical warnings left by travellers who went.</p>
          <ul className="space-y-2">
            {p.realityChecks.map((check) => {
              const meta = severityMeta(check.severity);
              return (
                <li key={check.id} className={cn('flex gap-3 rounded-2xl p-4 ring-1 ring-inset', meta.ring)}>
                  <Icon name={meta.icon} size={18} className={cn('mt-px', meta.className)} />
                  <p className="text-sm leading-relaxed text-ink">{check.text}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {a.frequentlyPairedWith.length > 0 && (
        <section className="mt-9" aria-labelledby="paired">
          <h2 id="paired" className="mb-1 text-[22px] font-bold tracking-tight">Usually visited with</h2>
          <p className="mb-3.5 text-[13px] text-ink-soft">Places that show up on the same trips.</p>
          <div className="flex flex-wrap gap-2">
            {a.frequentlyPairedWith.map((paired) => (
              <Link
                key={paired.id}
                to={`/places/${paired.slug}`}
                className="group ring-gradient flex items-center gap-2.5 rounded-pill bg-surface py-2 pl-2 pr-5 ring-1 ring-inset ring-line-soft transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-card"
              >
                <IconTile name={placeIcon(paired.category)} size="sm" tone="neutral" className="rounded-full" />
                <span className="text-[13.5px] font-medium transition-colors group-hover:text-brand">{paired.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------- experiences */}
      <section className="mt-10" aria-labelledby="experiences">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="experiences" className="text-[22px] font-bold tracking-tight">Traveller experiences</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              {month
                ? `Trips that started in ${MONTH_NAMES[month - 1]}`
                : 'Every public trip that came here'}
            </p>
          </div>
          {month !== undefined && (
            <button onClick={() => setMonth(undefined)} className="text-[13px] font-medium text-brand hover:underline">
              Show all months
            </button>
          )}
        </div>

        {experiences.isError ? (
          <ErrorState error={experiences.error} onRetry={() => experiences.refetch()} />
        ) : trips.length === 0 && !experiences.isLoading ? (
          <EmptyState
            icon="compass"
            title={month ? `No ${MONTH_NAMES[month - 1]} trips yet` : 'No experiences yet'}
            body={month ? 'Try another month, or view every experience.' : 'Be the first to document a trip here.'}
          />
        ) : (
          <>
            <TripGrid trips={trips} loading={experiences.isLoading} skeletons={4} />
            <LoadMore
              onVisible={() => experiences.fetchNextPage()}
              hasMore={!!experiences.hasNextPage}
              loading={experiences.isFetchingNextPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Aggregate travel data. Every average is gated on `hasEnoughData` — two trips
 * must never be presented as "4.9★ average".
 */
function Aggregates({
  aggregates: a, activeMonth, onMonthPick,
}: {
  aggregates: PlaceAggregates;
  activeMonth: number | undefined;
  onMonthPick: (month: number | undefined) => void;
}) {

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Experiences" value={compactCount(a.experienceCount)} hint={`${a.travelerCount} travellers`} />
        <Stat
          label="Experience rating"
          value={a.hasEnoughData && a.avgRating !== null ? a.avgRating.toFixed(1) : '—'}
          hint={a.hasEnoughData && a.avgRating !== null ? undefined : 'not enough data'}
          extra={a.hasEnoughData && a.avgRating !== null ? <Stars value={a.avgRating} size={12} /> : undefined}
        />
        <Stat
          label="Typical visit"
          value={a.hasEnoughData && a.avgVisitMinutes ? minutes(a.avgVisitMinutes)! : '—'}
          hint={a.hasEnoughData && a.avgVisitMinutes ? undefined : 'not enough data'}
        />
        <Stat
          label="Typical spend"
          value={a.hasEnoughData && a.avgSpendPerPerson !== null ? money(a.avgSpendPerPerson, 'INR')! : '—'}
          hint={a.hasEnoughData && a.avgSpendPerPerson !== null ? 'per person, whole trip' : 'not enough data'}
        />
      </div>

      {!a.hasEnoughData && a.experienceCount > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
          <Icon name="warning" size={15} className="mt-0.5 shrink-0" />
          <span>
            Only {a.experienceCount} {a.experienceCount === 1 ? 'experience' : 'experiences'} so far — averages need at
            least {a.minSampleSize} before they mean anything, so they are hidden.
          </span>
        </p>
      )}

      {a.popularTravelStyles.length > 0 && (
        <div>
          <h3 className="eyebrow mb-2">Popular with</h3>
          <div className="flex flex-wrap gap-1.5">
            {a.popularTravelStyles.map((style) => {
              const meta = styleMeta(style);
              return (
                <Badge key={style} tone="brand" className="px-3 py-1 text-xs">
                  <Icon name={meta.icon} size={13} /> {meta.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {a.hasEnoughData && a.ratingBreakdown.length > 0 && (
        <div>
          <h3 className="eyebrow mb-2.5">How travellers rate it</h3>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {a.ratingBreakdown.map((entry) => (
              <div key={entry.criteria} className="flex items-center gap-3">
                <dt className="w-28 shrink-0 truncate text-[13px] text-ink-soft">{criteriaLabel(entry.criteria)}</dt>
                <dd className="flex flex-1 items-center gap-2.5">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunk">
                    <span
                      className="block h-full rounded-pill bg-ember"
                      style={{ width: `${(entry.average / 5) * 100}%` }}
                    />
                  </span>
                  <span className="tnum w-7 shrink-0 text-xs font-semibold">{entry.average.toFixed(1)}</span>
                  <span className="tnum w-8 shrink-0 text-2xs text-ink-faint">{entry.count}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <MonthHistogram
        distribution={a.monthlyDistribution}
        activeMonth={activeMonth}
        onPick={onMonthPick}
      />
    </div>
  );
}

/**
 * Seasonal intelligence: when people actually go. One series, so the title
 * names it and no legend is needed; each bar is labelled on hover.
 */
function MonthHistogram({
  distribution, activeMonth, onPick,
}: {
  distribution: PlaceAggregates['monthlyDistribution'];
  activeMonth: number | undefined;
  onPick: (month: number | undefined) => void;
}) {
  const peak = Math.max(1, ...distribution.map((entry) => entry.experienceCount));
  const total = distribution.reduce((sum, entry) => sum + entry.experienceCount, 0);
  if (total === 0) return null;

  return (
    <div>
      <h3 className="eyebrow mb-2.5">When travellers go</h3>
      <div className="flex items-end gap-1.5">
        {distribution.map((entry) => {
          const height = (entry.experienceCount / peak) * 100;
          const empty = entry.experienceCount === 0;
          const active = activeMonth === entry.month;

          return (
            <button
              key={entry.month}
              type="button"
              disabled={empty}
              onClick={() => onPick(active ? undefined : entry.month)}
              aria-pressed={active}
              title={`${entry.label}: ${entry.experienceCount} ${entry.experienceCount === 1 ? 'experience' : 'experiences'}`}
              className="group flex flex-1 flex-col items-center gap-1.5 disabled:cursor-default"
            >
              <span
                className={cn(
                  'tnum text-2xs font-medium transition-opacity',
                  active ? 'text-brand opacity-100' : 'text-ink-faint opacity-0 group-hover:opacity-100',
                )}
              >
                {entry.experienceCount}
              </span>
              <span className="flex h-16 w-full items-end">
                <span
                  className={cn(
                    'w-full rounded-t-[4px] transition-colors',
                    empty ? 'bg-sunk' : active ? 'bg-ember' : 'bg-brand group-hover:bg-brand-ink',
                  )}
                  style={{ height: `${Math.max(empty ? 3 : 6, height)}%` }}
                />
              </span>
              <span className={cn('text-2xs', active ? 'font-semibold text-ember' : 'text-ink-faint')}>
                {entry.label[0]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-2xs text-ink-faint">
        Pick a month to read only those experiences — monsoon and December are
        different trips to the same place.
      </p>
    </div>
  );
}

function Stat({
  label, value, hint, extra,
}: {
  label: string;
  value: string;
  hint?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line-soft transition-shadow duration-300 hover:shadow-card">
      <p className="eyebrow mb-2">{label}</p>
      <p className="tnum text-[22px] font-bold leading-none tracking-tight">{value}</p>
      {extra && <div className="mt-1.5">{extra}</div>}
      {hint && <p className="mt-1.5 text-2xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function PlaceSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Skeleton className="-mx-4 aspect-[21/9] sm:mx-0 sm:rounded-xl2" />
      <div className="flex gap-3.5">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    </div>
  );
}
