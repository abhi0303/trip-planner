import { countryBbox } from '@/lib/countries';
import type { PlaceCategory } from '@/api/types';

/**
 * Type-ahead lookup against Photon, an OpenStreetMap geocoder built for
 * search-as-you-type. It needs no API key and no billing account, which is why
 * it is here and Google Places is not: Google's terms do not allow persisting
 * their place data, and this app writes every picked place into its own
 * catalogue via POST /places.
 *
 * Point VITE_GEOCODER_URL at a self-hosted Photon if the shared instance ever
 * starts rate-limiting — the public one is a free community service.
 *
 * Data © OpenStreetMap contributors, ODbL. The attribution is rendered next to
 * the results.
 */
const ENDPOINT = import.meta.env.VITE_GEOCODER_URL ?? 'https://photon.komoot.io/api';

/** Destinations and attractions. Shops and offices are noise here. */
const TAGS = ['place', 'natural', 'tourism', 'historic', 'leisure'];

export interface GeoSuggestion {
  key: string;
  name: string;
  category: PlaceCategory;
  countryCode: string;
  country: string;
  state: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  /** "Goa, India" — the line shown under the name. */
  line: string;
}

/** OSM key/value to our category enum. Anything unmapped becomes OTHER. */
const CATEGORY: Record<string, PlaceCategory> = {
  'place/city': 'CITY',
  'place/town': 'TOWN',
  'place/municipality': 'TOWN',
  'place/borough': 'TOWN',
  'place/suburb': 'TOWN',
  'place/village': 'VILLAGE',
  'place/hamlet': 'VILLAGE',
  'place/island': 'ISLAND',
  'place/islet': 'ISLAND',
  'place/archipelago': 'ISLAND',
  'natural/beach': 'BEACH',
  'natural/peak': 'MOUNTAIN',
  'natural/volcano': 'MOUNTAIN',
  'natural/ridge': 'MOUNTAIN',
  'natural/glacier': 'MOUNTAIN',
  'natural/water': 'LAKE',
  'natural/bay': 'LAKE',
  'natural/waterfall': 'WATERFALL',
  'waterway/waterfall': 'WATERFALL',
  'natural/wood': 'FOREST',
  'natural/forest': 'FOREST',
  'natural/desert': 'DESERT',
  'natural/sand': 'DESERT',
  'natural/dune': 'DESERT',
  'tourism/hotel': 'HOTEL',
  'tourism/resort': 'HOTEL',
  'tourism/guest_house': 'HOTEL',
  'tourism/hostel': 'HOTEL',
  'tourism/museum': 'MUSEUM',
  'tourism/viewpoint': 'VIEWPOINT',
  'tourism/zoo': 'WILDLIFE',
  'tourism/attraction': 'ACTIVITY',
  'tourism/artwork': 'ACTIVITY',
  'tourism/theme_park': 'ACTIVITY',
  'historic/monument': 'MONUMENT',
  'historic/memorial': 'MONUMENT',
  'historic/castle': 'FORT',
  'historic/fort': 'FORT',
  'historic/city_gate': 'FORT',
  'historic/church': 'CHURCH',
  'historic/temple': 'TEMPLE',
  'leisure/park': 'PARK',
  'leisure/garden': 'PARK',
  'leisure/nature_reserve': 'WILDLIFE',
  'leisure/beach_resort': 'BEACH',
};

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string; country?: string; countrycode?: string;
    state?: string; county?: string; city?: string; district?: string;
    osm_id?: number; osm_type?: string; osm_key?: string; osm_value?: string;
  };
}

/**
 * Suggestions for `query`, confined to `countryCode` when we know it. Without
 * that box the global ranking buries local results — "Ago" returns villages in
 * France rather than Agonda in Goa.
 */
export async function geocode(
  query: string,
  options: { countryCode?: string; limit?: number; signal?: AbortSignal } = {},
): Promise<GeoSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    lang: 'en',
    limit: String(options.limit ?? 6),
  });
  for (const tag of TAGS) params.append('osm_tag', tag);

  const box = countryBbox(options.countryCode);
  if (box) params.set('bbox', box.join(','));

  const response = await fetch(`${ENDPOINT}?${params}`, { signal: options.signal });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);

  const body = (await response.json()) as { features?: PhotonFeature[] };
  return (body.features ?? []).flatMap(toSuggestion);
}

function toSuggestion(feature: PhotonFeature): GeoSuggestion[] {
  const p = feature.properties;
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  // A result with no name is not something anyone can pick from a list.
  if (!p.name || typeof latitude !== 'number' || typeof longitude !== 'number') return [];

  const state = p.state ?? p.county ?? null;
  const city = p.city ?? p.district ?? null;
  // The name itself is often the city, so do not repeat it on the line below.
  const line = [city, state, p.country].filter((bit) => bit && bit !== p.name).join(', ');

  return [{
    key: `${p.osm_type ?? 'x'}${p.osm_id ?? `${latitude},${longitude}`}`,
    name: p.name,
    category: CATEGORY[`${p.osm_key}/${p.osm_value}`] ?? 'OTHER',
    countryCode: (p.countrycode ?? '').toUpperCase(),
    country: p.country ?? '',
    state,
    city,
    latitude,
    longitude,
    line,
  }];
}
