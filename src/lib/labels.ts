import type {
  ActivityKind, CrowdLevel, ExpenseCategory, PlaceCategory, RatingCriteria,
  RealitySeverity, Season, TravelStyle, Visibility, Weather,
} from '@/api/types';
import type { IconName } from '@/components/ui/Icon';

/** Turns any SCREAMING_SNAKE enum into Sentence case as a last resort. */
export const humanise = (value: string): string =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

interface Meta {
  label: string;
  icon: IconName;
}

export const TRAVEL_STYLE_META: Record<TravelStyle, Meta> = {
  BEACH: { label: 'Beach', icon: 'beach' },
  ADVENTURE: { label: 'Adventure', icon: 'adventure' },
  COUPLE: { label: 'Couple', icon: 'couple' },
  FAMILY: { label: 'Family', icon: 'family' },
  BACKPACKING: { label: 'Backpacking', icon: 'backpacking' },
  RELAXATION: { label: 'Relaxation', icon: 'relaxation' },
  CULTURE: { label: 'Culture', icon: 'culture' },
  FOOD: { label: 'Food', icon: 'food' },
  NIGHTLIFE: { label: 'Nightlife', icon: 'nightlife' },
  PHOTOGRAPHY: { label: 'Photography', icon: 'photography' },
  ROAD_TRIP: { label: 'Road trip', icon: 'roadTrip' },
  BUDGET: { label: 'Budget', icon: 'budget' },
  LUXURY: { label: 'Luxury', icon: 'luxury' },
  SOLO: { label: 'Solo', icon: 'solo' },
  FRIENDS: { label: 'Friends', icon: 'friends' },
  WORKATION: { label: 'Workation', icon: 'workation' },
  PILGRIMAGE: { label: 'Pilgrimage', icon: 'pilgrimage' },
  WILDLIFE: { label: 'Wildlife', icon: 'wildlife' },
};

/**
 * `color` is a CSS variable so the light and dark steps swap in one place.
 * The order below is the fixed categorical order — never cycle or reassign it,
 * or a filtered chart would repaint the categories that survived.
 */
export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, Meta & { color: string }> = {
  TRANSPORTATION: { label: 'Transport', icon: 'transport', color: 'var(--viz-transportation)' },
  STAY: { label: 'Stay', icon: 'stay', color: 'var(--viz-stay)' },
  FOOD: { label: 'Food', icon: 'food', color: 'var(--viz-food)' },
  ACTIVITIES: { label: 'Activities', icon: 'activity', color: 'var(--viz-activities)' },
  SHOPPING: { label: 'Shopping', icon: 'shopping', color: 'var(--viz-shopping)' },
  OTHER: { label: 'Other', icon: 'otherSpend', color: 'var(--viz-other)' },
};

export const WEATHER_META: Record<Weather, Meta> = {
  SUNNY: { label: 'Sunny', icon: 'sunny' },
  CLOUDY: { label: 'Cloudy', icon: 'cloudy' },
  RAINY: { label: 'Rainy', icon: 'rainy' },
  SNOWY: { label: 'Snowy', icon: 'snowy' },
  WINDY: { label: 'Windy', icon: 'windy' },
  FOGGY: { label: 'Foggy', icon: 'foggy' },
  MIXED: { label: 'Mixed', icon: 'mixedWeather' },
};

export const CROWD_META: Record<CrowdLevel, { label: string; bars: number }> = {
  VERY_LOW: { label: 'Very low', bars: 1 },
  LOW: { label: 'Low', bars: 2 },
  MODERATE: { label: 'Moderate', bars: 3 },
  HIGH: { label: 'High', bars: 4 },
  VERY_HIGH: { label: 'Very high', bars: 5 },
};

export const SEASON_META: Record<Season, Meta> = {
  WINTER: { label: 'Winter', icon: 'winter' },
  SPRING: { label: 'Spring', icon: 'spring' },
  SUMMER: { label: 'Summer', icon: 'summer' },
  MONSOON: { label: 'Monsoon', icon: 'monsoon' },
  AUTUMN: { label: 'Autumn', icon: 'autumn' },
};

export const RATING_CRITERIA_LABEL: Record<RatingCriteria, string> = {
  OVERALL: 'Overall',
  SCENERY: 'Scenery',
  CROWD: 'Crowd',
  CLEANLINESS: 'Cleanliness',
  ACCESSIBILITY: 'Accessibility',
  SAFETY: 'Safety',
  VALUE: 'Value for money',
  PHOTOGRAPHY: 'Photography',
  FOOD: 'Food',
  ACTIVITIES: 'Activities',
  FAMILY_FRIENDLY: 'Family friendly',
  COUPLE_FRIENDLY: 'Couple friendly',
  SOLO_FRIENDLY: 'Solo friendly',
  SERVICE: 'Service',
  LOCATION: 'Location',
  COMFORT: 'Comfort',
};

export const ACTIVITY_KIND_META: Record<ActivityKind, Meta> = {
  TRAVEL: { label: 'Travel', icon: 'travel' },
  CHECK_IN: { label: 'Check in', icon: 'checkIn' },
  CHECK_OUT: { label: 'Check out', icon: 'checkOut' },
  SIGHTSEEING: { label: 'Sightseeing', icon: 'sightseeing' },
  FOOD: { label: 'Food', icon: 'food' },
  ACTIVITY: { label: 'Activity', icon: 'activity' },
  REST: { label: 'Rest', icon: 'rest' },
  SHOPPING: { label: 'Shopping', icon: 'shopping' },
  OTHER: { label: 'Other', icon: 'pin' },
};

export const PLACE_CATEGORY_ICON: Record<PlaceCategory, IconName> = {
  BEACH: 'beach', MOUNTAIN: 'mountain', CITY: 'city', TOWN: 'town', VILLAGE: 'village',
  LAKE: 'lake', WATERFALL: 'waterfall', FOREST: 'forest', DESERT: 'desert', ISLAND: 'island',
  TEMPLE: 'temple', CHURCH: 'church', MOSQUE: 'mosque', MONUMENT: 'monument', MUSEUM: 'museum',
  FORT: 'fort', PARK: 'park', WILDLIFE: 'wildlife', VIEWPOINT: 'viewpoint', TREK: 'trek',
  RESTAURANT: 'restaurant', CAFE: 'cafe', BAR: 'bar', HOTEL: 'hotel', AIRPORT: 'airport',
  STATION: 'station', MARKET: 'market', ACTIVITY: 'activity', OTHER: 'pin',
};

export const VISIBILITY_META: Record<Visibility, Meta & { hint: string }> = {
  PUBLIC: { label: 'Public', icon: 'globe', hint: 'Anyone on TripSphere can see this' },
  FOLLOWERS: { label: 'Followers', icon: 'users', hint: 'Only people who follow you' },
  FRIENDS: { label: 'Friends', icon: 'couple', hint: 'Only people you follow who follow you back' },
  PRIVATE: { label: 'Only me', icon: 'lock', hint: 'Nobody else can see this' },
};

export const SEVERITY_META: Record<RealitySeverity, Meta & { className: string; ring: string }> = {
  INFO: { label: 'Good to know', icon: 'info', className: 'text-brand', ring: 'bg-brand/8 ring-brand/20' },
  WARNING: { label: 'Heads up', icon: 'warning', className: 'text-warn', ring: 'bg-warn/8 ring-warn/20' },
  DANGER: { label: 'Be careful', icon: 'danger', className: 'text-danger', ring: 'bg-danger/8 ring-danger/20' },
};

// ---- tolerant lookups, for values the client has not met yet ---------------

export const styleMeta = (style: string): Meta =>
  TRAVEL_STYLE_META[style as TravelStyle] ?? { label: humanise(style), icon: 'sparkle' };

export const categoryMeta = (category: string) =>
  EXPENSE_CATEGORY_META[category as ExpenseCategory] ??
  { label: humanise(category), icon: 'otherSpend' as IconName, color: 'var(--viz-other)' };

export const criteriaLabel = (criteria: string) =>
  RATING_CRITERIA_LABEL[criteria as RatingCriteria] ?? humanise(criteria);

export const placeIcon = (category: string): IconName =>
  PLACE_CATEGORY_ICON[category as PlaceCategory] ?? 'pin';

export const activityMeta = (kind: string): Meta =>
  ACTIVITY_KIND_META[kind as ActivityKind] ?? ACTIVITY_KIND_META.OTHER;

export const severityMeta = (severity: string) =>
  SEVERITY_META[severity as RealitySeverity] ?? SEVERITY_META.WARNING;

/** "South Goa, Goa, India" */
export function placeLine(place: { region: string | null; state: string | null; country: string }): string {
  return [place.region, place.state, place.country].filter(Boolean).join(', ');
}

/**
 * Collections carry a free-text `emoji` field in the API. We write short icon
 * tokens into it instead, and map anything unrecognised — including emoji
 * saved by an older client — onto a neutral folder icon.
 */
export const COLLECTION_ICONS: Array<{ token: string; icon: IconName; label: string }> = [
  { token: 'beach', icon: 'beach', label: 'Beach' },
  { token: 'mountain', icon: 'mountain', label: 'Mountain' },
  { token: 'lake', icon: 'lake', label: 'Water' },
  { token: 'culture', icon: 'culture', label: 'Culture' },
  { token: 'food', icon: 'food', label: 'Food' },
  { token: 'photography', icon: 'photography', label: 'Photography' },
  { token: 'budget', icon: 'budget', label: 'Budget' },
  { token: 'backpacking', icon: 'backpacking', label: 'Backpacking' },
  { token: 'island', icon: 'island', label: 'Island' },
  { token: 'city', icon: 'city', label: 'City' },
];

export const collectionIcon = (token: string | null | undefined): IconName =>
  COLLECTION_ICONS.find((entry) => entry.token === token)?.icon ?? 'saved';

/**
 * Whether a photo is the trip's cover. Prefers the server's `isCover` flag and
 * falls back to matching the trip's `coverMedia`, so this is correct on both
 * the old and new contract.
 */
export function isCoverPhoto(
  photo: { isCover?: boolean; media: { id: string } },
  trip: { coverMedia: { id: string } | null },
): boolean {
  if (typeof photo.isCover === 'boolean') return photo.isCover;
  return !!trip.coverMedia && trip.coverMedia.id === photo.media.id;
}
