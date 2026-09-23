/**
 * Hand-written against the TripSphere contract (swagger.json / Frontend Handbook).
 * Regenerate the exhaustive set any time with:
 *   npx openapi-typescript <swagger.json> -o src/api/schema.d.ts
 */

// ------------------------------------------------------------------ envelope

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  /** Search endpoints only — they are offset paged. */
  total?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INVALID_REFERENCE'
  | 'RATE_LIMITED'
  | 'TRIP_INCOMPLETE'
  | 'INTERNAL_ERROR';

// --------------------------------------------------------------------- enums

export const VISIBILITY = ['PUBLIC', 'FOLLOWERS', 'FRIENDS', 'PRIVATE'] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const TRIP_STATUS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type TripStatus = (typeof TRIP_STATUS)[number];

export const EXPENSE_MODE = ['TOTAL', 'DETAILED'] as const;
export type ExpenseMode = (typeof EXPENSE_MODE)[number];

export const EXPENSE_CATEGORY = [
  'TRANSPORTATION', 'STAY', 'FOOD', 'ACTIVITIES', 'SHOPPING', 'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORY)[number];

export const TRAVEL_STYLE = [
  'BEACH', 'ADVENTURE', 'COUPLE', 'FAMILY', 'BACKPACKING', 'RELAXATION',
  'CULTURE', 'FOOD', 'NIGHTLIFE', 'PHOTOGRAPHY', 'ROAD_TRIP', 'BUDGET',
  'LUXURY', 'SOLO', 'FRIENDS', 'WORKATION', 'PILGRIMAGE', 'WILDLIFE',
] as const;
export type TravelStyle = (typeof TRAVEL_STYLE)[number];

export const WEATHER = ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'WINDY', 'FOGGY', 'MIXED'] as const;
export type Weather = (typeof WEATHER)[number];

export const CROWD_LEVEL = ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'] as const;
export type CrowdLevel = (typeof CROWD_LEVEL)[number];

export const SEASON = ['WINTER', 'SPRING', 'SUMMER', 'MONSOON', 'AUTUMN'] as const;
export type Season = (typeof SEASON)[number];

export const PLACE_CATEGORY = [
  'BEACH', 'MOUNTAIN', 'CITY', 'TOWN', 'VILLAGE', 'LAKE', 'WATERFALL', 'FOREST',
  'DESERT', 'ISLAND', 'TEMPLE', 'CHURCH', 'MOSQUE', 'MONUMENT', 'MUSEUM', 'FORT',
  'PARK', 'WILDLIFE', 'VIEWPOINT', 'TREK', 'RESTAURANT', 'CAFE', 'BAR', 'HOTEL',
  'AIRPORT', 'STATION', 'MARKET', 'ACTIVITY', 'OTHER',
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORY)[number];

export const RATING_TYPE = ['TRIP', 'PLACE', 'HOTEL', 'RESTAURANT', 'ACTIVITY'] as const;
export type RatingType = (typeof RATING_TYPE)[number];

export const RATING_CRITERIA = [
  'OVERALL', 'SCENERY', 'CROWD', 'CLEANLINESS', 'ACCESSIBILITY', 'SAFETY',
  'VALUE', 'PHOTOGRAPHY', 'FOOD', 'ACTIVITIES', 'FAMILY_FRIENDLY',
  'COUPLE_FRIENDLY', 'SOLO_FRIENDLY', 'SERVICE', 'LOCATION', 'COMFORT',
] as const;
export type RatingCriteria = (typeof RATING_CRITERIA)[number];

export const ACTIVITY_KIND = [
  'TRAVEL', 'CHECK_IN', 'CHECK_OUT', 'SIGHTSEEING', 'FOOD',
  'ACTIVITY', 'REST', 'SHOPPING', 'OTHER',
] as const;
export type ActivityKind = (typeof ACTIVITY_KIND)[number];

export const REALITY_SEVERITY = ['INFO', 'WARNING', 'DANGER'] as const;
export type RealitySeverity = (typeof REALITY_SEVERITY)[number];

export const CURRENCY = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB',
  'AUD', 'JPY', 'LKR', 'NPR', 'IDR', 'MYR', 'VND',
] as const;
export type Currency = (typeof CURRENCY)[number];

export const REPORT_REASON = [
  'SPAM', 'OFFENSIVE', 'MISLEADING', 'FAKE_EXPERIENCE',
  'HARASSMENT', 'NUDITY', 'COPYRIGHT', 'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASON)[number];

export const TRIP_SORT = ['recent', 'oldest', 'popular', 'budget_low', 'budget_high'] as const;
export type TripSort = (typeof TRIP_SORT)[number];

export type FeedType = 'for-you' | 'following' | 'friends';

// --------------------------------------------------------------------- users

export interface UserSummary {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  /** null when the caller is anonymous — that means "unknown", not false. */
  isFollowing?: boolean | null;
}

export interface UserStats {
  trips: number;
  placesVisited: number;
  countries: number;
  followers: number;
  following: number;
  posts: number;
}

export interface UserProfile extends UserSummary {
  /** Only present on your own profile. */
  email?: string | null;
  bio: string | null;
  coverImage: string | null;
  homeCountry: string | null;
  homeCity: string | null;
  websiteUrl: string | null;
  currency: Currency;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  stats: UserStats;
  isFollowedBy?: boolean | null;
  isBlocked?: boolean | null;
  isSelf: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthSession {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface TravelMapEntry {
  countryCode: string;
  country: string;
  state: string | null;
  tripCount: number;
  placeCount: number;
  lastVisitedAt: string | null;
}

// --------------------------------------------------------------------- media

export interface Media {
  id: string;
  url: string;
  /** Always null today — no thumbnailing pipeline yet. Fall back to `url`. */
  thumbnailUrl: string | null;
  blurhash?: string | null;
  width?: number | null;
  height?: number | null;
}

// -------------------------------------------------------------------- places

export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
  country: string;
  state: string | null;
  region: string | null;
  category: PlaceCategory;
  coverImage: string | null;
  latitude: number | null;
  longitude: number | null;
  experienceCount: number;
}

export interface CriteriaRating {
  criteria: RatingCriteria | string;
  average: number;
  count: number;
}

export interface MonthlyDistribution {
  month: number;
  label: string;
  experienceCount: number;
}

export interface PlaceAggregates {
  experienceCount: number;
  travelerCount: number;
  /** False below minSampleSize — hide every average when this is false. */
  hasEnoughData: boolean;
  minSampleSize: number;
  avgRating: number | null;
  ratingBreakdown: CriteriaRating[];
  avgVisitMinutes: number | null;
  avgSpendPerPerson: number | null;
  avgTripDays: number | null;
  popularTravelStyles: TravelStyle[];
  monthlyDistribution: MonthlyDistribution[];
  frequentlyPairedWith: PlaceSummary[];
}

export interface PlaceRealityCheck {
  id: string;
  severity: RealitySeverity;
  text: string;
  createdAt?: string;
}

export interface PlaceDetail extends PlaceSummary {
  description: string | null;
  city: string | null;
  isVerified: boolean;
  parent: PlaceSummary | null;
  aggregates: PlaceAggregates;
  realityChecks: PlaceRealityCheck[];
}

// --------------------------------------------------------------------- trips

export interface TripCard {
  id: string;
  slug: string;
  title: string;
  country: string;
  countryCode: string;
  state: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  /** Derived server-side. Never compute these. */
  nights: number;
  days: number;
  travelerCount: number;
  /** null means hidden by the traveller — never render it as 0. */
  totalExpense: number | null;
  perPerson: number | null;
  currency: Currency;
  travelStyles: TravelStyle[];
  season: Season | null;
  placeCount: number;
  photoCount: number;
  saveCount: number;
  visibility: Visibility;
  user: UserSummary;
  coverMedia: Media | null;
  isSaved?: boolean | null;
  publishedAt: string | null;
}

export interface ExpenseSubcategoryBreakdown {
  subcategory: string;
  amount: number;
}

export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory;
  amount: number;
  /** Share of the trip total, 0-100. Feeds the bar chart directly. */
  percentage: number;
  subcategories: ExpenseSubcategoryBreakdown[];
}

export interface ExpenseSummary {
  mode: ExpenseMode;
  currency: Currency;
  total: number;
  perPerson: number;
  perDay: number;
  perPersonPerDay: number;
  travelerCount: number;
  days: number;
  byCategory: ExpenseCategoryBreakdown[];
}

export interface ExpenseLine {
  id: string;
  category: ExpenseCategory;
  subcategory: string | null;
  amount: number;
  expenseDate: string | null;
  description: string | null;
}

export interface TripPlace {
  id: string;
  place: PlaceSummary;
  visitDate: string | null;
  sequence: number;
  durationMinutes: number | null;
  notes: string | null;
}

export interface TripStay {
  id: string;
  hotelName: string;
  place: PlaceSummary | null;
  location: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  /** null when expenses are hidden from you. */
  amount: number | null;
  currency: Currency;
  roomType: string | null;
  rating: number | null;
  bookingPlatform: string | null;
  websiteUrl: string | null;
  notes: string | null;
}

export interface TripPhoto {
  id: string;
  media: Media;
  place: PlaceSummary | null;
  caption: string | null;
  takenAt: string | null;
  sequence: number;
  /**
   * Optional: the API gained this flag after the client did. Use
   * `isCoverPhoto()` rather than reading it directly — that falls back to
   * matching the trip's `coverMedia`, which works on either version.
   */
  isCover?: boolean;
}

export interface RatingGroup {
  ratingType: RatingType;
  place: PlaceSummary | null;
  stayId: string | null;
  scores: Record<string, number>;
  average: number;
}

export interface RealityCheck {
  id: string;
  severity: RealitySeverity;
  text: string;
  place: PlaceSummary | null;
}

export interface TripActivity {
  id: string;
  title: string;
  kind: ActivityKind;
  place: PlaceSummary | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  sequence: number;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  date: string | null;
  title: string | null;
  summary: string | null;
  activities: TripActivity[];
}

export interface TripDetail extends TripCard {
  status: TripStatus;
  expenseVisibility: Visibility;
  adults: number;
  children: number;
  infants: number;
  weather: Weather | null;
  crowdLevel: CrowdLevel | null;
  experience: string | null;
  enjoyedMost: string | null;
  surprisedBy: string | null;
  wentWrong: string | null;
  wouldDoDifferently: string | null;
  adviceForTravelers: string | null;
  /** null when expenses are hidden from you. */
  expenses: ExpenseSummary | null;
  places: TripPlace[];
  stays: TripStay[];
  photos: TripPhoto[];
  ratings: RatingGroup[];
  realityChecks: RealityCheck[];
  itinerary: TripDay[];
  viewCount: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /trips/meta/enums. Both matrices are validated server-side, so read them
 * from here rather than hardcoding: a FLIGHT under FOOD, or SCENERY on a HOTEL,
 * is a 400.
 */
export interface TripMeta {
  expenseSubcategories: Record<ExpenseCategory, string[]>;
  ratingCriteria: Record<RatingType, RatingCriteria[]>;
}

// --------------------------------------------------------------------- posts

export interface Post {
  id: string;
  user: UserSummary;
  caption: string | null;
  media: Media[];
  trip: TripCard | null;
  place: PlaceSummary | null;
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  isLiked?: boolean | null;
  isSaved?: boolean | null;
  isOwner: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  user: UserSummary;
  body: string;
  parentId: string | null;
  replyCount: number;
  isOwner: boolean;
  createdAt: string;
}

export interface ToggleResult {
  active: boolean;
  count: number;
}

export interface Collection {
  id: string;
  name: string;
  emoji: string | null;
  isPrivate: boolean;
  itemCount: number;
  createdAt: string;
}

export interface SearchAll {
  trips: TripCard[];
  places: PlaceSummary[];
  users: UserSummary[];
  totals?: { trips: number; places: number; users: number };
}

// ------------------------------------------------------------ request bodies

export interface TripFilters {
  userId?: string;
  countryCode?: string;
  state?: string;
  destinationId?: string;
  placeId?: string;
  travelStyles?: TravelStyle[];
  minBudget?: number;
  maxBudget?: number;
  minDays?: number;
  maxDays?: number;
  travelerCount?: number;
  month?: number;
  season?: Season;
  sort?: TripSort;
  status?: TripStatus;
  limit?: number;
  cursor?: string;
}

export interface CreateTripBody {
  title: string;
  countryCode: string;
  country: string;
  state?: string;
  destination: string;
  destinationId?: string;
  startDate: string;
  endDate: string;
  adults?: number;
  children?: number;
  infants?: number;
  expenseMode?: ExpenseMode;
  totalExpense?: number;
  currency?: Currency;
  travelStyles?: TravelStyle[];
  weather?: Weather;
  crowdLevel?: CrowdLevel;
  visibility?: Visibility;
  expenseVisibility?: Visibility;
  experience?: string;
  enjoyedMost?: string;
  surprisedBy?: string;
  wentWrong?: string;
  wouldDoDifferently?: string;
  adviceForTravelers?: string;
  coverMediaId?: string;
}

export type UpdateTripBody = Partial<CreateTripBody>;

export interface ExpenseInput {
  category: ExpenseCategory;
  subcategory?: string;
  amount: number;
  expenseDate?: string;
  description?: string;
}

export interface StayInput {
  hotelName: string;
  placeId?: string;
  location?: string;
  checkIn?: string;
  checkOut?: string;
  amount?: number;
  roomType?: string;
  rating?: number;
  bookingPlatform?: string;
  websiteUrl?: string;
  notes?: string;
}

export interface RatingInput {
  ratingType: RatingType;
  placeId?: string;
  stayId?: string;
  ratings: Array<{ criteria: RatingCriteria; score: number }>;
}

export interface UpdateProfileBody {
  name?: string;
  username?: string;
  bio?: string;
  /** A media URL, or null to remove it — an empty string fails URL validation. */
  profileImage?: string | null;
  coverImage?: string | null;
  /** ISO 3166-1 alpha-2, e.g. "IN". */
  homeCountry?: string;
  homeCity?: string;
  websiteUrl?: string;
  currency?: Currency;
}
