import { useEffect, useState } from 'react';
import { placesApi } from '@/api/endpoints';
import { useGeoSearch, usePlaceSearch } from '@/api/queries';
import { placeIcon, placeLine } from '@/lib/labels';
import { Icon, IconTile } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Button';
import type { GeoSuggestion } from '@/lib/geocode';
import type { PlaceSummary } from '@/api/types';

/**
 * Search the canonical catalogue first; only create a place when nothing
 * matches. POST /places is find-or-create, so two people adding "Cola Beach"
 * still land on the same row — which is what makes place aggregates work.
 *
 * What the catalogue does not have, the map usually does. Those suggestions
 * carry the real spelling and coordinates, so a place created from one is a
 * proper record rather than whatever the traveller typed.
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
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const results = usePlaceSearch(debounced, {
    countryCode: country?.countryCode,
    destinationsOnly,
  });

  const items = results.data?.items ?? [];
  const typed = debounced.trim();
  const exact = items.some((place) => place.name.toLowerCase() === typed.toLowerCase());

  // Only ask the map once the catalogue has come back thin. No point offering
  // "Agonda, Goa" from OSM when TripSphere already has an Agonda with reviews.
  const geo = useGeoSearch(debounced, country?.countryCode, !results.isFetching && items.length < 5);
  const known = new Set(items.map((place) => place.name.toLowerCase()));
  const suggestions = (geo.data ?? [])
    // The bbox is a coarse pre-filter and straddles borders — an India box
    // reaches into Pakistani Punjab. Since a pick is stored under the trip's
    // country, drop anything that is not actually in it.
    .filter((s) => !country?.countryCode || s.countryCode === country.countryCode)
    .filter((s) => !known.has(s.name.toLowerCase()))
    .slice(0, 5);

  const reset = () => { setQuery(''); setDebounced(''); };

  const add = async (body: Parameters<typeof placesApi.create>[0], token: string) => {
    setCreating(token);
    try {
      onPick(await placesApi.create(body));
      reset();
    } finally {
      setCreating(null);
    }
  };

  const addFromMap = (suggestion: GeoSuggestion) => add({
    name: suggestion.name,
    // The trip's country wins: the geocoder is confined to it anyway, and this
    // keeps the catalogue consistent with how the rest of the trip is stored.
    countryCode: country?.countryCode ?? suggestion.countryCode,
    country: country?.country ?? suggestion.country,
    state: suggestion.state ?? country?.state,
    city: suggestion.city ?? undefined,
    category: suggestion.category,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    isDestination: destinationsOnly,
  }, suggestion.key);

  const addAsTyped = () => country && add({
    name: typed,
    countryCode: country.countryCode,
    country: country.country,
    state: country.state,
    isDestination: destinationsOnly,
  }, 'typed');

  const canCreate = typed.length >= 2 && !exact && !!country?.countryCode;
  const showList = typed.length >= 2;

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
        {(results.isFetching || geo.isFetching) && (
          <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        )}
      </div>

      {showList && (
        <ul className="overflow-hidden rounded-xl border border-line-soft">
          {items.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => { onPick(place); reset(); }}
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

          {suggestions.length > 0 && (
            <>
              <li className="flex items-baseline justify-between gap-2 border-b border-line-soft bg-sunk/60 px-3 py-1.5">
                <span className="eyebrow">From the map</span>
                <span className="text-[10px] text-ink-faint">© OpenStreetMap</span>
              </li>
              {suggestions.map((suggestion) => (
                <li key={suggestion.key}>
                  <button
                    type="button"
                    onClick={() => addFromMap(suggestion)}
                    disabled={!!creating}
                    className="flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-sunk disabled:opacity-60"
                  >
                    {creating === suggestion.key ? (
                      <Spinner className="mx-1.5 h-4 w-4 text-brand" />
                    ) : (
                      <IconTile name={placeIcon(suggestion.category)} size="sm" tone="neutral" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{suggestion.name}</span>
                      <span className="block truncate text-2xs text-ink-faint">{suggestion.line}</span>
                    </span>
                    <Icon name="plus" size={15} className="shrink-0 text-ink-faint" />
                  </button>
                </li>
              ))}
            </>
          )}

          {canCreate && (
            <li>
              <button
                type="button"
                onClick={addAsTyped}
                disabled={!!creating}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-sunk disabled:opacity-60"
              >
                {creating === 'typed' ? <Spinner className="h-4 w-4 text-brand" /> : <Icon name="plus" size={16} className="text-brand" />}
                <span className="text-sm">
                  Add <span className="font-semibold">“{typed}”</span> as a new place
                  {suggestions.length > 0 && <span className="text-ink-faint"> — exactly as typed</span>}
                </span>
              </button>
            </li>
          )}

          {items.length === 0 && suggestions.length === 0 && !canCreate && !results.isFetching && (
            <li className="px-3 py-3 text-[13px] text-ink-faint">
              {country?.countryCode ? 'No matches.' : 'Pick a country first to add new places.'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
