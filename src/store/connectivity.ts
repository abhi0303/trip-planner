import { useSyncExternalStore } from 'react';

/**
 * Whether the app can currently reach its data, kept separate from whether the
 * device has a network. They fail differently and deserve different words: a
 * phone in a tunnel is the traveller's problem to wait out, while a server that
 * sleeps on a free tier is ours to explain.
 *
 * `navigator.onLine` alone is not enough — it reports the network adapter, not
 * whether anything answers — so reachability is observed from real requests,
 * reported by the API client as they succeed or fail.
 */
export type Reach =
  /** Nothing has been tried yet. */
  | 'unknown'
  /** The device itself has no connection. */
  | 'offline'
  /** Online, but the API is not answering — usually a cold start. */
  | 'unreachable'
  /** Answering normally. */
  | 'live';

interface State {
  reach: Reach;
  /** When the API last answered, for "saved 5 minutes ago". */
  lastContactAt: number | null;
}

const deviceOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

let state: State = {
  reach: deviceOnline() ? 'unknown' : 'offline',
  lastContactAt: null,
};

const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  const merged = { ...state, ...next };
  if (merged.reach === state.reach && merged.lastContactAt === state.lastContactAt) return;
  state = merged;
  listeners.forEach((listener) => listener());
}

export const connectivity = {
  /** Called by the API client whenever a request comes back. */
  reportSuccess() {
    set({ reach: 'live', lastContactAt: Date.now() });
  },

  /**
   * Called when a request never reached the server. An offline device is not a
   * broken server, so the device is asked first.
   */
  reportFailure() {
    set({ reach: deviceOnline() ? 'unreachable' : 'offline' });
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  snapshot: () => state,

  /** The last moment real data arrived, for the offline banner. */
  seedLastContact(at: number | null) {
    if (at && !state.lastContactAt) set({ lastContactAt: at });
  },
};

if (typeof window !== 'undefined') {
  // Coming back online says the adapter is up, not that the API is awake, so
  // reachability drops back to unknown and the next request decides.
  window.addEventListener('online', () => set({ reach: 'unknown' }));
  window.addEventListener('offline', () => set({ reach: 'offline' }));
}

const server = () => state;

export function useConnectivity(): State {
  return useSyncExternalStore(connectivity.subscribe, connectivity.snapshot, server);
}
