import { ApiError, api, apiPage, qs } from './client';
import type {
  ActivityKind, AuthSession, Collection, Comment, CreateTripBody, ExpenseInput, ExpenseLine,
  ExpenseSummary, FeedType, Media, PlaceCategory, PlaceDetail, PlaceSummary, Post, RatingInput,
  ReportReason, SearchAll, StayInput, ToggleResult, TravelMapEntry, TripCard, TripDay, TripDetail,
  TripFilters, TripMeta, TripPhoto, TripPlace, TripStay, UpdateProfileBody, UpdateTripBody,
  UserProfile, UserSummary,
} from './types';

// ---------------------------------------------------------------------- auth

export const authApi = {
  register: (body: { email: string; username: string; name: string; password: string }) =>
    api<AuthSession>('/auth/register', { method: 'POST', body }),

  /** `identifier` accepts an email or a username. */
  login: (body: { identifier: string; password: string }) =>
    api<AuthSession>('/auth/login', { method: 'POST', body }),

  google: (idToken: string, username?: string) =>
    api<AuthSession>('/auth/google', { method: 'POST', body: { idToken, username } }),

  me: () => api<UserProfile>('/auth/me'),

  logout: (refreshToken: string) =>
    api<{ message: string }>('/auth/logout', { method: 'POST', body: { refreshToken } }),

  logoutAll: () => api<{ message: string }>('/auth/logout-all', { method: 'POST' }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<{ message: string }>('/auth/change-password', { method: 'POST', body }),
};

// --------------------------------------------------------------------- users

export const usersApi = {
  profile: (idOrUsername: string) => api<UserProfile>(`/users/${idOrUsername}`),

  updateMe: (body: UpdateProfileBody) => api<UserProfile>('/users/me', { method: 'PATCH', body }),

  deactivate: () => api<{ message: string }>('/users/me', { method: 'DELETE' }),

  follow: (idOrUsername: string) =>
    api<{ following: boolean; followerCount: number }>(`/users/${idOrUsername}/follow`, { method: 'POST' }),

  unfollow: (idOrUsername: string) =>
    api<{ following: boolean; followerCount: number }>(`/users/${idOrUsername}/follow`, { method: 'DELETE' }),

  followers: (idOrUsername: string, cursor?: string) =>
    apiPage<UserSummary>(`/users/${idOrUsername}/followers${qs({ cursor, limit: 24 })}`),

  following: (idOrUsername: string, cursor?: string) =>
    apiPage<UserSummary>(`/users/${idOrUsername}/following${qs({ cursor, limit: 24 })}`),

  travelMap: (idOrUsername: string) => api<TravelMapEntry[]>(`/users/${idOrUsername}/travel-map`),

  block: (userId: string, reason?: string) =>
    api<{ message: string }>(`/users/${userId}/block`, { method: 'POST', body: { reason } }),

  unblock: (userId: string) => api<{ message: string }>(`/users/${userId}/block`, { method: 'DELETE' }),

  blocked: () => api<UserSummary[]>('/users/me/blocked'),
};

// -------------------------------------------------------------------- places

export const placesApi = {
  search: (params: {
    q?: string; countryCode?: string; state?: string;
    category?: PlaceCategory; destinationsOnly?: boolean; page?: number; limit?: number;
  }) => apiPage<PlaceSummary>(`/places/search${qs(params)}`),

  popular: (limit = 12) => api<PlaceSummary[]>(`/places/popular${qs({ limit })}`),

  destinations: (countryCode: string) =>
    api<PlaceSummary[]>(`/places/destinations${qs({ countryCode })}`),

  detail: (idOrSlug: string) => api<PlaceDetail>(`/places/${idOrSlug}`),

  experiences: (idOrSlug: string, params: { cursor?: string; month?: number; limit?: number } = {}) =>
    apiPage<TripCard>(`/places/${idOrSlug}/experiences${qs(params)}`),

  /** Find-or-create: two users adding "Cola Beach" get the same row back. */
  create: (body: {
    name: string; countryCode: string; country: string; state?: string;
    region?: string; city?: string; category?: PlaceCategory;
    latitude?: number; longitude?: number; description?: string;
    parentId?: string; isDestination?: boolean;
  }) => api<PlaceSummary>('/places', { method: 'POST', body }),
};

// --------------------------------------------------------------------- trips

export const tripsApi = {
  meta: () => api<TripMeta>('/trips/meta/enums'),

  list: (filters: TripFilters = {}) => apiPage<TripCard>(`/trips${qs(filters as Record<string, unknown>)}`),

  listMine: (filters: TripFilters = {}) => apiPage<TripCard>(`/trips/me${qs(filters as Record<string, unknown>)}`),

  detail: (idOrSlug: string) => api<TripDetail>(`/trips/${idOrSlug}`),

  create: (body: CreateTripBody) => api<TripDetail>('/trips', { method: 'POST', body }),

  update: (id: string, body: UpdateTripBody) => api<TripDetail>(`/trips/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => api<{ message: string }>(`/trips/${id}`, { method: 'DELETE' }),

  /** Throws ApiError with code TRIP_INCOMPLETE and `details.problems` when not ready. */
  publish: (id: string) => api<TripDetail>(`/trips/${id}/publish`, { method: 'POST' }),

  unpublish: (id: string) => api<TripDetail>(`/trips/${id}/unpublish`, { method: 'POST' }),

  save: (id: string, collectionId?: string) =>
    api<ToggleResult>(`/trips/${id}/save`, { method: 'POST', body: { collectionId } }),

  unsave: (id: string) => api<ToggleResult>(`/trips/${id}/save`, { method: 'DELETE' }),

  // ---- places on a trip
  addPlace: (tripId: string, body: { placeId: string; visitDate?: string; sequence?: number; durationMinutes?: number; notes?: string }) =>
    api<TripPlace>(`/trips/${tripId}/places`, { method: 'POST', body }),

  updatePlace: (tripId: string, tripPlaceId: string, body: { visitDate?: string; sequence?: number; durationMinutes?: number; notes?: string }) =>
    api<TripPlace>(`/trips/${tripId}/places/${tripPlaceId}`, { method: 'PATCH', body }),

  removePlace: (tripId: string, tripPlaceId: string) =>
    api<{ message: string }>(`/trips/${tripId}/places/${tripPlaceId}`, { method: 'DELETE' }),

  /** Send every id, in the new order. */
  reorderPlaces: (tripId: string, tripPlaceIds: string[]) =>
    api<TripPlace[]>(`/trips/${tripId}/places/order`, { method: 'PUT', body: { tripPlaceIds } }),

  // ---- expenses
  expenses: (tripId: string) => api<ExpenseSummary>(`/trips/${tripId}/expenses`),

  /** Replaces every line item and returns the recalculated summary. */
  replaceExpenses: (tripId: string, expenses: ExpenseInput[]) =>
    api<ExpenseSummary>(`/trips/${tripId}/expenses`, { method: 'PUT', body: { expenses } }),

  addExpense: (tripId: string, body: ExpenseInput) =>
    api<ExpenseLine>(`/trips/${tripId}/expenses`, { method: 'POST', body }),

  updateExpense: (tripId: string, expenseId: string, body: Partial<ExpenseInput>) =>
    api<ExpenseLine>(`/trips/${tripId}/expenses/${expenseId}`, { method: 'PATCH', body }),

  removeExpense: (tripId: string, expenseId: string) =>
    api<{ message: string }>(`/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' }),

  // ---- stays
  addStay: (tripId: string, body: StayInput) =>
    api<TripStay>(`/trips/${tripId}/stays`, { method: 'POST', body }),

  updateStay: (tripId: string, stayId: string, body: Partial<StayInput>) =>
    api<TripStay>(`/trips/${tripId}/stays/${stayId}`, { method: 'PATCH', body }),

  removeStay: (tripId: string, stayId: string) =>
    api<{ message: string }>(`/trips/${tripId}/stays/${stayId}`, { method: 'DELETE' }),

  // ---- photos
  addPhotos: (
    tripId: string,
    photos: Array<{ mediaId: string; placeId?: string; caption?: string; takenAt?: string; sequence?: number; isCover?: boolean }>,
  ) => api<TripPhoto[]>(`/trips/${tripId}/photos`, { method: 'POST', body: { photos } }),

  /**
   * Promotes a photo to the trip cover. Prefers the dedicated endpoint, which
   * returns the whole photo list with updated flags. That route is not on every
   * deployment yet, so a 404 falls back to setting `coverMediaId` on the trip —
   * same outcome, and it removes the need to gate the UI on a backend version.
   */
  setPhotoCover: async (tripId: string, photoId: string, mediaId: string): Promise<TripPhoto[] | null> => {
    try {
      return await api<TripPhoto[]>(`/trips/${tripId}/photos/${photoId}/cover`, { method: 'PUT' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        await api<TripDetail>(`/trips/${tripId}`, { method: 'PATCH', body: { coverMediaId: mediaId } });
        return null;
      }
      throw error;
    }
  },

  removePhoto: (tripId: string, photoId: string) =>
    api<{ message: string }>(`/trips/${tripId}/photos/${photoId}`, { method: 'DELETE' }),

  // ---- ratings & reality checks
  /** Upserts one rating group. Re-submitting overwrites rather than duplicating. */
  submitRatings: (tripId: string, body: RatingInput) =>
    api<TripDetail['ratings']>(`/trips/${tripId}/ratings`, { method: 'PUT', body }),

  addRealityCheck: (tripId: string, body: { text: string; severity?: string; placeId?: string }) =>
    api<TripDetail['realityChecks'][number]>(`/trips/${tripId}/reality-checks`, { method: 'POST', body }),

  removeRealityCheck: (tripId: string, id: string) =>
    api<{ message: string }>(`/trips/${tripId}/reality-checks/${id}`, { method: 'DELETE' }),

  // ---- itinerary
  itinerary: (tripId: string) => api<TripDay[]>(`/trips/${tripId}/itinerary`),

  upsertDay: (tripId: string, body: { dayNumber: number; title?: string; summary?: string }) =>
    api<TripDay>(`/trips/${tripId}/itinerary/days`, { method: 'PUT', body }),

  removeDay: (tripId: string, dayNumber: number) =>
    api<{ message: string }>(`/trips/${tripId}/itinerary/days/${dayNumber}`, { method: 'DELETE' }),

  /** Creates the day if it does not exist yet. */
  addActivity: (tripId: string, dayNumber: number, body: {
    title: string; kind?: ActivityKind; placeId?: string;
    startTime?: string; endTime?: string; notes?: string; sequence?: number;
  }) => api<TripDay['activities'][number]>(`/trips/${tripId}/itinerary/days/${dayNumber}/activities`, { method: 'POST', body }),

  reorderActivities: (tripId: string, dayNumber: number, activityIds: string[]) =>
    api<TripDay>(`/trips/${tripId}/itinerary/days/${dayNumber}/activities/order`, { method: 'PUT', body: { activityIds } }),

  updateActivity: (tripId: string, activityId: string, body: Record<string, unknown>) =>
    api<TripDay['activities'][number]>(`/trips/${tripId}/itinerary/activities/${activityId}`, { method: 'PATCH', body }),

  removeActivity: (tripId: string, activityId: string) =>
    api<{ message: string }>(`/trips/${tripId}/itinerary/activities/${activityId}`, { method: 'DELETE' }),
};

// --------------------------------------------------------------- posts, feed

export const postsApi = {
  feed: (type: FeedType, cursor?: string) =>
    apiPage<Post>(`/feed${qs({ type, cursor, limit: 12 })}`),

  list: (params: { userId?: string; tripId?: string; placeId?: string; cursor?: string } = {}) =>
    apiPage<Post>(`/posts${qs(params)}`),

  detail: (id: string) => api<Post>(`/posts/${id}`),

  create: (body: { tripId?: string; placeId?: string; caption?: string; mediaIds?: string[]; visibility?: string }) =>
    api<Post>('/posts', { method: 'POST', body }),

  update: (id: string, body: { caption?: string; visibility?: string }) =>
    api<Post>(`/posts/${id}`, { method: 'PATCH', body }),

  remove: (id: string) => api<{ message: string }>(`/posts/${id}`, { method: 'DELETE' }),

  like: (id: string) => api<ToggleResult>(`/posts/${id}/like`, { method: 'POST' }),
  unlike: (id: string) => api<ToggleResult>(`/posts/${id}/like`, { method: 'DELETE' }),

  save: (id: string, collectionId?: string) =>
    api<ToggleResult>(`/posts/${id}/save`, { method: 'POST', body: { collectionId } }),
  unsave: (id: string) => api<ToggleResult>(`/posts/${id}/save`, { method: 'DELETE' }),

  share: (id: string) => api<ToggleResult>(`/posts/${id}/share`, { method: 'POST' }),

  comments: (id: string, cursor?: string) =>
    apiPage<Comment>(`/posts/${id}/comments${qs({ cursor, limit: 20 })}`),

  addComment: (id: string, body: string, parentId?: string) =>
    api<Comment>(`/posts/${id}/comments`, { method: 'POST', body: { body, parentId } }),

  replies: (commentId: string, cursor?: string) =>
    apiPage<Comment>(`/posts/comments/${commentId}/replies${qs({ cursor })}`),

  removeComment: (commentId: string) =>
    api<{ message: string }>(`/posts/comments/${commentId}`, { method: 'DELETE' }),
};

// ------------------------------------------------------- saved & collections

export const savedApi = {
  collections: () => api<Collection[]>('/collections'),

  createCollection: (body: { name: string; emoji?: string; isPrivate?: boolean }) =>
    api<Collection>('/collections', { method: 'POST', body }),

  removeCollection: (id: string) => api<{ message: string }>(`/collections/${id}`, { method: 'DELETE' }),

  trips: (collectionId?: string, cursor?: string) =>
    apiPage<TripCard>(`/saved/trips${qs({ collectionId, cursor, limit: 20 })}`),
};

// -------------------------------------------------------------------- search

export const searchApi = {
  all: (q: string) => api<SearchAll>(`/search${qs({ q })}`),
  trips: (q: string, page = 1) => apiPage<TripCard>(`/search/trips${qs({ q, page, limit: 20 })}`),
  places: (q: string, page = 1) => apiPage<PlaceSummary>(`/search/places${qs({ q, page, limit: 20 })}`),
  users: (q: string, page = 1) => apiPage<UserSummary>(`/search/users${qs({ q, page, limit: 20 })}`),
};

// --------------------------------------------------------------------- media

export const mediaApi = {
  /** multipart/form-data, field name `files`, up to 20 per call. */
  upload: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return api<Media[]>('/media/upload', { method: 'POST', body: form });
  },

  mine: () => api<Media[]>('/media/me'),

  remove: (id: string) => api<{ message: string }>(`/media/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------- moderation

export const moderationApi = {
  report: (body: { targetType: 'USER' | 'TRIP' | 'POST' | 'COMMENT' | 'PLACE'; targetId: string; reason: ReportReason; details?: string }) =>
    api<{ message: string }>('/reports', { method: 'POST', body }),
};
