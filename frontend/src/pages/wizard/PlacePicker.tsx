import { useEffect, useState } from 'react';
import { placesApi } from '@/api/endpoints';
import { usePlaceSearch } from '@/api/queries';
import { placeIcon, placeLine } from '@/lib/labels';
import { Icon, IconTile } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Button';
import type { PlaceSummary } from '@/api/types';

/**
 * Search the canonical catalogue first; only create a place when nothing
 * matches. POST /places is find-or-create, so two people adding "Cola Beach"
 * still land on the same row — which is what makes place aggregates work.
 */
export function PlacePicker({
  onPick, country, destinationsOnly, placeholder = 'Search places…', autoFocus,
}: {
  onPick: (place: PlaceSummary) => void;
  country?: { countryCode: string; country: string; state?: string };
  destinationsOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const results = usePlaceSearch(debounced, {
    countryCode: country?.countryCode,
    destinationsOnly,
  });

  const items = results.data?.items ?? [];
  const exact = items.some((place) => place.name.toLowerCase() === debounced.trim().toLowerCase());
  const canCreate = debounced.trim().length >= 2 && !exact && !!country?.countryCode;

  const create = async () => {
    if (!country) return;
    setCreating(true);
    try {
      const place = await placesApi.create({
        name: debounced.trim(),
        countryCode: country.countryCode,
        country: country.country,
        state: country.state,
        isDestination: destinationsOnly,
      });
      onPick(place);
      setQuery('');
      setDebounced('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search places"
        />
        {results.isFetching && (
          <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        )}
      </div>

      {debounced.trim().length >= 2 && (
        <ul className="overflow-hidden rounded-xl border border-line-soft">
          {items.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(place);
                  setQuery('');
                  setDebounced('');
                }}
                className="flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-sunk"
              >
                <IconTile name={placeIcon(place.category)} size="sm" tone="neutral" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{place.name}</span>
                  <span className="block truncate text-2xs text-ink-faint">{placeLine(place)}</span>
                </span>
                {place.experienceCount > 0 && (
                  <span className="tnum shrink-0 text-2xs text-ink-faint">{place.experienceCount}</span>
                )}
              </button>
            </li>
          ))}

          {canCreate && (
            <li>
              <button
                type="button"
                onClick={create}
                disabled={creating}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-sunk disabled:opacity-60"
              >
                {creating ? <Spinner className="h-4 w-4 text-brand" /> : <Icon name="plus" size={16} className="text-brand" />}
                <span className="text-sm">
                  Add <span className="font-semibold">“{debounced.trim()}”</span> as a new place
                </span>
              </button>
            </li>
          )}

          {items.length === 0 && !canCreate && !results.isFetching && (
            <li className="px-3 py-3 text-[13px] text-ink-faint">
              {country?.countryCode ? 'No matches.' : 'Pick a country first to add new places.'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
