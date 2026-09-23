import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  flatten, useSearchAll, useSearchPlaces, useSearchTrips, useSearchUsers,
} from '@/api/queries';
import { compactCount } from '@/lib/format';
import { placeIcon, placeLine } from '@/lib/labels';
import { Avatar, EmptyState, Tabs } from '@/components/ui/Bits';
import { IconTile } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { TripGrid } from '@/components/trip/TripCard';
import type { PlaceSummary, UserSummary } from '@/api/types';

type Tab = 'all' | 'trips' | 'places' | 'people';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => setInput(q), [q]);

  const all = useSearchAll(q);
  const trips = useSearchTrips(q, tab === 'trips');
  const places = useSearchPlaces(q, tab === 'places');
  const users = useSearchUsers(q, tab === 'people');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form onSubmit={submit} className="mb-5">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Goa, Cola Beach, budget trips, a traveller…"
          aria-label="Search"
          className="h-12 text-base"
          autoFocus={!q}
        />
      </form>

      {!q ? (
        <EmptyState
          icon="search"
          title="Search real travel experiences"
          body="Places, trips and the people who documented them."
        />
      ) : (
        <>
          <Tabs
            tabs={[
              { value: 'all', label: 'Top' },
              { value: 'trips', label: 'Trips', badge: all.data?.totals?.trips },
              { value: 'places', label: 'Places', badge: all.data?.totals?.places },
              { value: 'people', label: 'People', badge: all.data?.totals?.users },
            ]}
            value={tab}
            onChange={setTab}
            className="mb-5"
          />

          {tab === 'all' && (
            all.isError ? (
              <ErrorState error={all.error} onRetry={() => all.refetch()} />
            ) : all.isLoading ? (
              <TripGrid trips={[]} loading skeletons={4} />
            ) : (
              <div className="space-y-8">
                {!!all.data?.places?.length && (
                  <section>
                    <h2 className="eyebrow mb-2.5">Places</h2>
                    <PlaceList places={all.data.places} />
                  </section>
                )}
                {!!all.data?.trips?.length && (
                  <section>
                    <h2 className="eyebrow mb-2.5">Trips</h2>
                    <TripGrid trips={all.data.trips} />
                  </section>
                )}
                {!!all.data?.users?.length && (
                  <section>
                    <h2 className="eyebrow mb-2.5">People</h2>
                    <UserList users={all.data.users} />
                  </section>
                )}
                {!all.data?.places?.length && !all.data?.trips?.length && !all.data?.users?.length && (
                  <EmptyState icon="search" title={`Nothing for “${q}”`} body="Try a place name, a country, or a traveller's username." />
                )}
              </div>
            )
          )}

          {tab === 'trips' && (
            <>
              <TripGrid trips={flatten(trips.data)} loading={trips.isLoading} skeletons={4} />
              <LoadMore onVisible={() => trips.fetchNextPage()} hasMore={!!trips.hasNextPage} loading={trips.isFetchingNextPage} />
            </>
          )}

          {tab === 'places' && (
            <>
              <PlaceList places={flatten(places.data)} />
              <LoadMore onVisible={() => places.fetchNextPage()} hasMore={!!places.hasNextPage} loading={places.isFetchingNextPage} />
            </>
          )}

          {tab === 'people' && (
            <>
              <UserList users={flatten(users.data)} />
              <LoadMore onVisible={() => users.fetchNextPage()} hasMore={!!users.hasNextPage} loading={users.isFetchingNextPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function PlaceList({ places }: { places: PlaceSummary[] }) {
  if (!places.length) return <EmptyState icon="pin" title="No places found" />;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {places.map((place) => (
        <li key={place.id}>
          <Link
            to={`/places/${place.slug}`}
            className="group flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-inset ring-line-soft transition-all duration-200 ease-spring hover:shadow-card hover:ring-brand/40"
          >
            <IconTile name={placeIcon(place.category)} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold transition-colors group-hover:text-brand">{place.name}</span>
              <span className="block truncate text-xs text-ink-faint">{placeLine(place)}</span>
            </span>
            {place.experienceCount > 0 && (
              <span className="tnum shrink-0 text-2xs text-ink-faint">
                {compactCount(place.experienceCount)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function UserList({ users }: { users: UserSummary[] }) {
  if (!users.length) return <EmptyState icon="user" title="No people found" />;
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {users.map((user) => (
        <li key={user.id}>
          <Link to={`/@${user.username}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-sunk">
            <Avatar user={user} size="md" link={false} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-ink-faint">@{user.username}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
