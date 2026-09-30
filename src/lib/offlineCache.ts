import type { QueryClient } from '@tanstack/react-query';
import { keys } from '@/api/queries';
import { connectivity } from '@/store/connectivity';
import type { FeedType, Page, Post, TripDetail, UserProfile } from '@/api/types';
import { CACHE_STORE, CACHE_VERSION, idb, usable, type CacheRecord } from './offlineDb';

/**
 * A deliberately small slice of the app, kept on the device so a cold-starting
 * server shows the last known screen instead of a spinner.
 *
 * Only what someone looks at first is kept: who they are, the top of the feed,
 * and the handful of trips they were just reading. Everything else — comments,
 * search, other people's profiles — still waits for the server, because a stale
 * answer there is worse than an honest wait.
 */

/** Enough to fill the first screen of the feed without storing the whole thing. */
const MAX_FEED_ITEMS = 10;
/** The trips someone is actually moving between; older ones are evicted. */
const MAX_TRIPS = 3;

const PROFILE_KEY = 'profile';
const feedKey = (type: FeedType) => `feed:${type}`;
const tripKey = (idOrSlug: string) => `trip:${idOrSlug}`;

type FeedPages = { pages: Page<Post>[]; pageParams: unknown[] };

async function write(key: string, userId: string, data: unknown) {
  const record: CacheRecord = { key, userId, savedAt: Date.now(), version: CACHE_VERSION, data };
  await idb.put(CACHE_STORE, record);
}

async function read<T>(key: string, userId: string): Promise<CacheRecord<T> | null> {
  const record = await idb.get<CacheRecord<T>>(CACHE_STORE, key);
  return usable(record, userId) ? record! : null;
}

// ------------------------------------------------------------------ profile

export const saveProfile = (user: UserProfile) => write(PROFILE_KEY, user.id, user);

/**
 * The signed-in user, read before the network answers. The id is not known yet
 * at this point — that is what we are fetching — so this is the one record read
 * without a user check, and it carries its own id for everything after.
 */
export async function readProfile(): Promise<UserProfile | null> {
  const record = await idb.get<CacheRecord<UserProfile>>(CACHE_STORE, PROFILE_KEY);
  if (!record || record.version !== CACHE_VERSION) return null;
  connectivity.seedLastContact(record.savedAt);
  return record.data;
}

// ------------------------------------------------------- trimming for writes

/** Keeps the first page only, capped, so the cache cannot grow with scrolling. */
function trimFeed(data: FeedPages): FeedPages | null {
  const first = data.pages?.[0];
  if (!first) return null;
  return {
    pages: [{ ...first, items: first.items.slice(0, MAX_FEED_ITEMS) }],
    pageParams: [data.pageParams?.[0]],
  };
}

/** Evicts the least recently saved trip once a fourth arrives. */
async function evictTrips(userId: string) {
  const rows = await idb.all<CacheRecord>(CACHE_STORE);
  const trips = rows
    .filter((row) => row.key.startsWith('trip:') && row.userId === userId)
    .sort((a, b) => b.savedAt - a.savedAt);
  await Promise.all(trips.slice(MAX_TRIPS).map((row) => idb.del(CACHE_STORE, row.key)));
}

// ----------------------------------------------------------------- hydration

/**
 * Seeds the query cache from disk before anything is fetched.
 *
 * Each entry keeps the timestamp it was written with rather than landing as
 * fresh data. That is the whole trick: React Query sees data that is already
 * past its staleTime, so it paints immediately *and* refetches, which is the
 * stale-while-revalidate behaviour this is for. Marking it fresh would show the
 * same screen but leave it stale for 30 seconds.
 */
export async function hydrate(client: QueryClient, userId: string): Promise<void> {
  const rows = await idb.all<CacheRecord>(CACHE_STORE);

  for (const row of rows) {
    if (!usable(row, userId)) continue;

    if (row.key.startsWith('feed:')) {
      const type = row.key.slice('feed:'.length) as FeedType;
      client.setQueryData(keys.feed(type), row.data, { updatedAt: row.savedAt });
    } else if (row.key.startsWith('trip:')) {
      const idOrSlug = row.key.slice('trip:'.length);
      client.setQueryData(keys.trip(idOrSlug), row.data, { updatedAt: row.savedAt });
    }
  }
}

// -------------------------------------------------------------- write-through

/**
 * Mirrors successful reads to disk. Subscribing to the cache keeps this in one
 * place — the alternative is an onSuccess in every hook, which drifts the first
 * time someone adds a screen.
 */
export function watch(client: QueryClient, getUserId: () => string | null): () => void {
  return client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;

    const userId = getUserId();
    if (!userId) return;

    const [head, second] = event.query.queryKey as [string, string?];
    const data = event.query.state.data;
    if (data === undefined) return;

    if (head === 'feed' && second) {
      const trimmed = trimFeed(data as FeedPages);
      if (trimmed) void write(feedKey(second as FeedType), userId, trimmed);
      return;
    }

    if (head === 'trip' && second) {
      // Drafts belong to the wizard, not the reading cache.
      if ((data as TripDetail).status === 'DRAFT') return;
      void write(tripKey(second), userId, data).then(() => evictTrips(userId));
    }
  });
}

// --------------------------------------------------------------------- ages

/** The newest thing on disk, used to say how old the offline screen is. */
export async function lastSavedAt(userId: string): Promise<number | null> {
  const rows = await idb.all<CacheRecord>(CACHE_STORE);
  const mine = rows.filter((row) => usable(row, userId));
  return mine.length ? Math.max(...mine.map((row) => row.savedAt)) : null;
}
