import { useState } from 'react';
import { Link } from 'react-router-dom';
import { flatten, usePopularPlaces, useTrips } from '@/api/queries';
import { TripGrid } from '@/components/trip/TripCard';
import { TripFilterBar } from '@/components/trip/TripFilters';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { placeIcon } from '@/lib/labels';
import { Icon, IconTile } from '@/components/ui/Icon';
import { compactCount } from '@/lib/format';
import type { TripFilters } from '@/api/types';

export function ExplorePage() {
  const [filters, setFilters] = useState<TripFilters>({ sort: 'popular' });
  const trips = useTrips(filters);
  const items = flatten(trips.data);

  return (
    <div>
      <PageHero
        icon="compass"
        eyebrow="Discovery"
        title={<>Explore trips people <span className="text-gradient">actually took</span></>}
        lead="Every trip here is a real record — what it cost, where they went, what they would do differently. Filter by budget, duration, party size and season."
      />

      <PlaceRail />

      <TripFilterBar value={filters} onChange={setFilters} />

      {trips.isError ? (
        <ErrorState error={trips.error} onRetry={() => trips.refetch()} />
      ) : items.length === 0 && !trips.isLoading ? (
        <EmptyState
          icon="search"
          title="No trips match those filters"
          body="Try widening the budget or clearing the travel styles."
          action={<Button variant="outline" onClick={() => setFilters({ sort: 'popular' })}>Clear filters</Button>}
        />
      ) : (
        <>
          <TripGrid trips={items} loading={trips.isLoading} />
          <LoadMore
            onVisible={() => trips.fetchNextPage()}
            hasMore={!!trips.hasNextPage}
            loading={trips.isFetchingNextPage}
          />
        </>
      )}
    </div>
  );
}

/** Horizontally scrolling rail of the best-documented places. */
function PlaceRail() {
  const places = usePopularPlaces(14);
  if (!places.data?.length) return null;

  return (
    <section className="mb-6" aria-labelledby="rail-heading">
      <h2 id="rail-heading" className="eyebrow mb-3">Most documented places</h2>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:px-0">
        {places.data.map((place, index) => (
          <Link
            key={place.id}
            to={`/places/${place.slug}`}
            style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
            className="group ring-gradient flex shrink-0 animate-fade-up items-center gap-3 rounded-pill bg-surface py-2 pl-2 pr-5 ring-1 ring-inset ring-line-soft transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-card"
          >
            <IconTile name={placeIcon(place.category)} size="sm" className="rounded-full" />
            <span>
              <span className="block whitespace-nowrap text-[13.5px] font-semibold transition-colors group-hover:text-brand">
                {place.name}
              </span>
              <span className="tnum block whitespace-nowrap text-2xs text-ink-faint">
                {compactCount(place.experienceCount)} experiences
              </span>
            </span>
            <Icon name="arrowRight" size={14} className="text-ink-faint transition-transform duration-300 ease-spring group-hover:translate-x-1 group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </section>
  );
}
