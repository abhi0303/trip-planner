/**
 * A very small IndexedDB wrapper, written by hand rather than pulled in.
 *
 * The app only needs put/get/getAll/delete over two stores, and every call has
 * to survive the database being unavailable — Safari private mode, blocked site
 * data, a storage quota — by behaving as though the cache were simply empty.
 * A dependency would not make that part shorter.
 */

const DB_NAME = 'tripsphere';
const DB_VERSION = 1;

export const CACHE_STORE = 'cache';
export const OUTBOX_STORE = 'outbox';

/**
 * Bumped whenever a cached shape changes. Records written under an older
 * version are ignored on read and cleared, so a released type change can never
 * hydrate the UI with a shape it no longer understands.
 */
export const CACHE_VERSION = 1;

export interface CacheRecord<T = unknown> {
  /** 'profile' | `feed:${FeedType}` | `trip:${idOrSlug}` */
  key: string;
  /** Whose data this is. A different user's cache is never shown. */
  userId: string;
  savedAt: number;
  version: number;
  data: T;
}

export interface OutboxRecord {
  id: string;
  userId: string;
  savedAt: number;
  version: number;
  kind: 'create-trip';
  /** The wizard's own state, replayed as a normal create once back online. */
  payload: unknown;
}

let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;

  opening = new Promise<IDBDatabase | null>((resolve) => {
    // Absent entirely in some embedded webviews, and the constructor itself
    // throws rather than returning null when site data is blocked.
    if (typeof indexedDB === 'undefined') return resolve(null);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    // A blocked upgrade would otherwise hang this promise forever.
    request.onblocked = () => resolve(null);
  });

  return opening;
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  return open().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      let request: IDBRequest;
      try {
        request = work(db.transaction(store, mode).objectStore(store));
      } catch {
        return resolve(null);
      }
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
    });
  });
}

export const idb = {
  get: <T>(store: string, key: string) => run<T>(store, 'readonly', (s) => s.get(key)),
  all: <T>(store: string) => run<T[]>(store, 'readonly', (s) => s.getAll()).then((rows) => rows ?? []),
  put: (store: string, value: unknown) => run(store, 'readwrite', (s) => s.put(value)),
  del: (store: string, key: string) => run(store, 'readwrite', (s) => s.delete(key)),
  clear: (store: string) => run(store, 'readwrite', (s) => s.clear()),
};

/** Drops everything. Used on sign-out, so a shared device leaks nothing. */
export async function wipeOfflineData(): Promise<void> {
  await Promise.all([idb.clear(CACHE_STORE), idb.clear(OUTBOX_STORE)]);
}

/** True when a record is this user's and written by this cache version. */
export function usable(
  record: { userId: string; version: number } | null | undefined,
  userId: string,
): boolean {
  return !!record && record.version === CACHE_VERSION && record.userId === userId;
}
