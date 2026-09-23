import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { duration, formatDateRange, moneyShort, travelers } from '@/lib/format';
import { meshGradient } from '@/lib/visual';
import { styleMeta } from '@/lib/labels';
import { Avatar, Badge } from '@/components/ui/Bits';
import { FloatButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/store/auth';
import { useSaveTripMutation } from '@/api/queries';
import type { TripCard as TripCardType } from '@/api/types';

export function TripCard({
  trip, className, style,
}: {
  trip: TripCardType;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { signedIn } = useAuth();
  const save = useSaveTripMutation();

  // null means the traveller hid their spending — never render it as zero.
  const spendHidden = trip.totalExpense === null;
  const total = moneyShort(trip.totalExpense, trip.currency);
  const perPerson = moneyShort(trip.perPerson, trip.currency);

  return (
    <article
      className={cn(
        'group relative isolate flex flex-col overflow-hidden rounded-card bg-surface',
        'ring-1 ring-inset ring-line-soft transition-all duration-300 ease-spring',
        'hover:-translate-y-1 hover:shadow-lift hover:ring-brand/30',
        className,
      )}
      style={style}
    >
      <Link to={`/trips/${trip.slug}`} className="relative block aspect-[16/11] overflow-hidden bg-sunk">
        {trip.coverMedia ? (
          <img
            src={trip.coverMedia.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-spring group-hover:scale-[1.06]"
          />
        ) : (
          // No photo yet: draw deterministic artwork rather than a grey panel.
          <div className="h-full w-full" style={{ backgroundImage: meshGradient(trip.id) }} aria-hidden />
        )}

        {/* Scrim carries the text; without it a light photo swallows white type. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15" aria-hidden />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="glass">
              <Icon name="pin" size={11} />
              {trip.destination}
            </Badge>
            {trip.season && <Badge tone="glass" className="capitalize">{trip.season.toLowerCase()}</Badge>}
          </div>

          {signedIn && (
            <FloatButton
              active={!!trip.isSaved}
              aria-label={trip.isSaved ? 'Remove from saved' : 'Save trip'}
              aria-pressed={!!trip.isSaved}
              onClick={(event) => {
                event.preventDefault();
                save.mutate({ tripId: trip.id, saved: !!trip.isSaved });
              }}
            >
              <Icon name="bookmark" size={16} filled={!!trip.isSaved} strokeWidth={1.9} />
            </FloatButton>
          )}
        </div>

        {/* Cost sits on the image: it is the first thing people compare. */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <h3 className="mb-2 line-clamp-2 font-display text-[19px] font-semibold leading-snug text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.4)]">
            {trip.title}
          </h3>

          {spendHidden ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/85">
              <Icon name="lock" size={13} /> Spending hidden
            </span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="tnum text-[26px] font-bold leading-none text-white">{total}</span>
              {perPerson && <span className="tnum text-[13px] text-white/75">{perPerson}/person</span>}
            </div>
          )}

          <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-white/75">
            <dd className="tnum">{duration(trip.nights, trip.days)}</dd>
            <dd className="tnum">{travelers(trip.travelerCount)}</dd>
            <dd className="tnum">{trip.placeCount} places</dd>
          </dl>
        </div>

        {trip.visibility !== 'PUBLIC' && (
          <span className="absolute bottom-3.5 right-3.5">
            <Badge tone="glass"><Icon name="lock" size={11} />{trip.visibility.toLowerCase()}</Badge>
          </span>
        )}
      </Link>

      {/* Name and dates stack, so a full name never competes with the date
          range for the same line and gets truncated. */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 sm:px-5">
        <Avatar user={trip.user} size="sm" />
        <span className="min-w-0 flex-1">
          <Link
            to={`/@${trip.user.username}`}
            className="block truncate text-[13.5px] font-medium transition-colors hover:text-brand"
          >
            {trip.user.name}
          </Link>
          <span className="tnum block truncate text-xs text-ink-faint">
            {formatDateRange(trip.startDate, trip.endDate)}
          </span>
        </span>
      </div>

      {trip.travelStyles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-4 pt-3 sm:px-5">
          {trip.travelStyles.slice(0, 4).map((style) => {
            const meta = styleMeta(style);
            return (
              <Badge key={style} tone="neutral">
                <Icon name={meta.icon} size={12} />{meta.label}
              </Badge>
            );
          })}
          {trip.travelStyles.length > 4 && <Badge tone="neutral">+{trip.travelStyles.length - 4}</Badge>}
        </div>
      )}
    </article>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line-soft">
      <div className="skeleton aspect-[16/11] rounded-none" />
      <div className="flex items-center gap-2.5 p-4">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="skeleton h-3 flex-1" />
      </div>
    </div>
  );
}

export function TripGrid({
  trips, loading, skeletons = 8,
}: {
  trips: TripCardType[];
  loading?: boolean;
  skeletons?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
      {trips.map((trip, index) => (
        <TripCard
          key={trip.id}
          trip={trip}
          // A short stagger makes a page of cards feel like it arrives, not blinks.
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}
        />
      ))}
      {loading && Array.from({ length: skeletons }).map((_, index) => <TripCardSkeleton key={`s${index}`} />)}
    </div>
  );
}
