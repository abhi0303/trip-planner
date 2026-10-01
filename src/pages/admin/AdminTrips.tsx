import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminTrips } from '@/api/queries';
import { formatDateRange } from '@/lib/format';
import { Badge, EmptyState, Skeleton } from '@/components/ui/Bits';
import { Card } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { ErrorState } from '@/components/layout/States';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import type { TripStatus, Visibility } from '@/api/types';

/**
 * Every trip, drafts and private ones included. Those are things their authors
 * never published, so each row says so plainly rather than looking like
 * anything else on the platform.
 */
export function AdminTrips() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const trips = useAdminTrips({
    q: params.get('q') || undefined,
    status: (params.get('status') as TripStatus) || undefined,
    visibility: (params.get('visibility') as Visibility) || undefined,
    limit: 25,
  });

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => { event.preventDefault(); set('q', q.trim()); }} className="relative">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search by title or destination"
          className="pl-10"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        <Dropdown
          size="sm" className="w-[150px]" placeholder="Any status"
          value={params.get('status') ?? ''}
          onChange={(value) => set('status', value)}
          options={[{ value: '', label: 'Any status' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'ARCHIVED', label: 'Archived' }]}
        />
        <Dropdown
          size="sm" className="w-[160px]" placeholder="Any visibility"
          value={params.get('visibility') ?? ''}
          onChange={(value) => set('visibility', value)}
          options={[{ value: '', label: 'Any visibility' },
            { value: 'PUBLIC', label: 'Public' },
            { value: 'FOLLOWERS', label: 'Followers' },
            { value: 'FRIENDS', label: 'Friends' },
            { value: 'PRIVATE', label: 'Private' }]}
        />
      </div>

      {trips.isError ? (
        <ErrorState error={trips.error} onRetry={() => trips.refetch()} />
      ) : trips.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[76px] rounded-xl2" />)}
        </div>
      ) : !trips.data?.items.length ? (
        <EmptyState icon="route" title="No trips match" body="Nothing fits those filters." />
      ) : (
        <ul className="space-y-2">
          {trips.data.items.map((trip) => (
            <li key={trip.id}>
              <Card className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{trip.title}</p>
                    {trip.status === 'DRAFT' && <Badge tone="warn">Draft</Badge>}
                    {trip.visibility === 'PRIVATE' && <Badge tone="warn">Private</Badge>}
                  </div>
                  <p className="truncate text-xs text-ink-faint">
                    {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
                  </p>
                  {trip.user && (
                    <p className="mt-0.5 truncate text-2xs text-ink-faint">by @{trip.user.username}</p>
                  )}
                </div>

                <Link
                  to={`/trips/${trip.slug ?? trip.id}`}
                  aria-label={`Open ${trip.title}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
                >
                  <Icon name="chevronRight" size={16} />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
