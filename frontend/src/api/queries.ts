import {
  useInfiniteQuery, useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query';
import {
  placesApi, postsApi, savedApi, searchApi, tripsApi, usersApi,
} from './endpoints';
import type { FeedType, Post, TripCard, TripFilters } from './types';

/** One place for every cache key, so invalidation never guesses. */
export const keys = {
  meta: ['meta'] as const,
  feed: (type: FeedType) => ['feed', type] as const,
  trips: (filters: TripFilters) => ['trips', filters] as const,
  myTrips: (filters: TripFilters) => ['trips', 'me', filters] as const,
  trip: (idOrSlug: string) => ['trip', idOrSlug] as const,
  place: (idOrSlug: string) => ['place', idOrSlug] as const,
  placeExperiences: (idOrSlug: string, month?: number) => ['place', idOrSlug, 'experiences', month ?? null] as const,
  popularPlaces: ['places', 'popular'] as const,
  user: (idOrUsername: string) => ['user', idOrUsername] as const,
  userTrips: (userId: string) => ['trips', { userId }] as const,
  travelMap: (idOrUsername: string) => ['user', idOrUsername, 'travel-map'] as const,
  followers: (idOrUsername: string) => ['user', idOrUsername, 'followers'] as const,
  following: (idOrUsername: string) => ['user', idOrUsername, 'following'] as const,
  post: (id: string) => ['post', id] as const,
  comments: (postId: string) => ['post', postId, 'comments'] as const,
  collections: ['collections'] as const,
  savedTrips: (collectionId?: string) => ['saved', 'trips', collectionId ?? 'all'] as const,
  search: (q: string) => ['search', q] as const,
};

const cursorPages = {
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: { nextCursor: string | null; hasMore: boolean }) =>
    last.hasMore ? last.nextCursor ?? undefined : undefined,
};

// ---------------------------------------------------------------------- meta

/** Enum matrices are server-validated, so never hard-code them client side. */
export const useTripMeta = () =>
  useQuery({
    queryKey: keys.meta,
    queryFn: tripsApi.meta,
    staleTime: 60 * 60 * 1000,
  });

// ---------------------------------------------------------------------- feed

export const useFeed = (type: FeedType, enabled = true) =>
  useInfiniteQuery({
    queryKey: keys.feed(type),
    queryFn: ({ pageParam }) => postsApi.feed(type, pageParam),
    enabled,
    ...cursorPages,
  });

// --------------------------------------------------------------------- trips

export const useTrips = (filters: TripFilters = {}) =>
  useInfiniteQuery({
    queryKey: keys.trips(filters),
    queryFn: ({ pageParam }) => tripsApi.list({ ...filters, cursor: pageParam }),
    ...cursorPages,
  });

export const useMyTrips = (filters: TripFilters = {}, enabled = true) =>
  useInfiniteQuery({
    queryKey: keys.myTrips(filters),
    queryFn: ({ pageParam }) => tripsApi.listMine({ ...filters, cursor: pageParam }),
    enabled,
    ...cursorPages,
  });

export const useTrip = (idOrSlug: string | undefined) =>
  useQuery({
    queryKey: keys.trip(idOrSlug ?? ''),
    queryFn: () => tripsApi.detail(idOrSlug!),
    enabled: !!idOrSlug,
  });

// -------------------------------------------------------------------- places

export const usePlace = (idOrSlug: string | undefined) =>
  useQuery({
    queryKey: keys.place(idOrSlug ?? ''),
    queryFn: () => placesApi.detail(idOrSlug!),
    enabled: !!idOrSlug,
  });

export const usePlaceExperiences = (idOrSlug: string | undefined, month?: number) =>
  useInfiniteQuery({
    queryKey: keys.placeExperiences(idOrSlug ?? '', month),
    queryFn: ({ pageParam }) => placesApi.experiences(idOrSlug!, { cursor: pageParam, month }),
    enabled: !!idOrSlug,
    ...cursorPages,
  });

export const usePopularPlaces = (limit = 12) =>
  useQuery({
    queryKey: [...keys.popularPlaces, limit],
    queryFn: () => placesApi.popular(limit),
    staleTime: 10 * 60 * 1000,
  });

/** Debounced type-ahead for the trip wizard's place picker. */
export const usePlaceSearch = (q: string, params: { countryCode?: string; destinationsOnly?: boolean } = {}) =>
  useQuery({
    queryKey: ['places', 'search', q, params],
    queryFn: () => placesApi.search({ q, ...params, limit: 10 }),
    enabled: q.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

// --------------------------------------------------------------------- users

export const useUser = (idOrUsername: string | undefined) =>
  useQuery({
    queryKey: keys.user(idOrUsername ?? ''),
    queryFn: () => usersApi.profile(idOrUsername!),
    enabled: !!idOrUsername,
  });

export const useTravelMap = (idOrUsername: string | undefined) =>
  useQuery({
    queryKey: keys.travelMap(idOrUsername ?? ''),
    queryFn: () => usersApi.travelMap(idOrUsername!),
    enabled: !!idOrUsername,
  });

export const useFollowList = (idOrUsername: string | undefined, kind: 'followers' | 'following') =>
  useInfiniteQuery({
    queryKey: kind === 'followers' ? keys.followers(idOrUsername ?? '') : keys.following(idOrUsername ?? ''),
    queryFn: ({ pageParam }) =>
      kind === 'followers'
        ? usersApi.followers(idOrUsername!, pageParam)
        : usersApi.following(idOrUsername!, pageParam),
    enabled: !!idOrUsername,
    ...cursorPages,
  });

/**
 * Follow/unfollow with an optimistic profile update — the button must not wait
 * for a round trip on a cold-starting server.
 */
export function useFollowMutation(idOrUsername: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing ? usersApi.unfollow(idOrUsername) : usersApi.follow(idOrUsername),
    onMutate: async (currentlyFollowing) => {
      await queryClient.cancelQueries({ queryKey: keys.user(idOrUsername) });
      const previous = queryClient.getQueryData(keys.user(idOrUsername));
      queryClient.setQueryData(keys.user(idOrUsername), (old: any) =>
        old
          ? {
              ...old,
              isFollowing: !currentlyFollowing,
              stats: {
                ...old.stats,
                followers: Math.max(0, old.stats.followers + (currentlyFollowing ? -1 : 1)),
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(keys.user(idOrUsername), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.user(idOrUsername) });
    },
  });
}

// --------------------------------------------------------------------- posts

export const usePost = (id: string | undefined) =>
  useQuery({
    queryKey: keys.post(id ?? ''),
    queryFn: () => postsApi.detail(id!),
    enabled: !!id,
  });

export const useComments = (postId: string | undefined) =>
  useInfiniteQuery({
    queryKey: keys.comments(postId ?? ''),
    queryFn: ({ pageParam }) => postsApi.comments(postId!, pageParam),
    enabled: !!postId,
    ...cursorPages,
  });

/**
 * Likes are optimistic and patch every cached page that holds this post, so
 * the heart never flickers between the feed and the detail screen.
 */
export function useLikeMutation() {
  const queryClient = useQueryClient();

  const patch = (postId: string, liked: boolean, delta: number) => {
    queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: { items: Post[] }) => ({
          ...page,
          items: page.items.map((post) =>
            post.id === postId
              ? { ...post, isLiked: liked, likeCount: Math.max(0, post.likeCount + delta) }
              : post,
          ),
        })),
      };
    });
    queryClient.setQueryData(keys.post(postId), (old: any) =>
      old ? { ...old, isLiked: liked, likeCount: Math.max(0, old.likeCount + delta) } : old,
    );
  };

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked ? postsApi.unlike(postId) : postsApi.like(postId),
    onMutate: ({ postId, liked }) => {
      patch(postId, !liked, liked ? -1 : 1);
      return { postId, liked };
    },
    onError: (_error, { postId, liked }) => patch(postId, liked, liked ? 1 : -1),
  });
}

export function useSaveTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, saved }: { tripId: string; saved: boolean; collectionId?: string }) =>
      saved ? tripsApi.unsave(tripId) : tripsApi.save(tripId),
    onMutate: async ({ tripId, saved }) => {
      const patch = (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: { items: TripCard[] }) => ({
              ...page,
              items: page.items.map((trip) =>
                trip.id === tripId
                  ? { ...trip, isSaved: !saved, saveCount: Math.max(0, trip.saveCount + (saved ? -1 : 1)) }
                  : trip,
              ),
            })),
          };
        }
        return old.id === tripId
          ? { ...old, isSaved: !saved, saveCount: Math.max(0, old.saveCount + (saved ? -1 : 1)) }
          : old;
      };

      queryClient.setQueriesData({ queryKey: ['trips'] }, patch);
      queryClient.setQueriesData({ queryKey: ['trip'] }, patch);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.savedTrips() });
    },
  });
}

// --------------------------------------------------------------------- saved

export const useCollections = (enabled = true) =>
  useQuery({ queryKey: keys.collections, queryFn: savedApi.collections, enabled });

export const useSavedTrips = (collectionId?: string, enabled = true) =>
  useInfiniteQuery({
    queryKey: keys.savedTrips(collectionId),
    queryFn: ({ pageParam }) => savedApi.trips(collectionId, pageParam),
    enabled,
    ...cursorPages,
  });

// -------------------------------------------------------------------- search

export const useSearchAll = (q: string) =>
  useQuery({
    queryKey: keys.search(q),
    queryFn: () => searchApi.all(q),
    enabled: q.trim().length >= 2,
  });

export const useSearchTrips = (q: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['search', 'trips', q],
    queryFn: ({ pageParam = 1 }) => searchApi.trips(q, pageParam as number),
    enabled: enabled && q.trim().length >= 2,
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

export const useSearchPlaces = (q: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['search', 'places', q],
    queryFn: ({ pageParam = 1 }) => searchApi.places(q, pageParam as number),
    enabled: enabled && q.trim().length >= 2,
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

export const useSearchUsers = (q: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['search', 'users', q],
    queryFn: ({ pageParam = 1 }) => searchApi.users(q, pageParam as number),
    enabled: enabled && q.trim().length >= 2,
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

/** Flattens an infinite query into a plain array for rendering. */
export function flatten<T>(data: { pages: Array<{ items: T[] }> } | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
