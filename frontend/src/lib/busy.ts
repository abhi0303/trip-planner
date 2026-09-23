import { useSyncExternalStore } from 'react';

/**
 * Counts in-flight work that does not go through TanStack Query. The wizard
 * calls the API directly for its section saves, so `useIsMutating` never sees
 * them — without this the global loader would only appear for the refetch
 * afterwards, missing the slow part.
 */
let count = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const busy = {
  start() {
    count += 1;
    emit();
  },
  end() {
    count = Math.max(0, count - 1);
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  snapshot: () => count,
};

/** Wraps a promise so the global loader covers it. */
export async function track<T>(work: Promise<T>): Promise<T> {
  busy.start();
  try {
    return await work;
  } finally {
    busy.end();
  }
}

export function useBusyCount(): number {
  return useSyncExternalStore(busy.subscribe, busy.snapshot, () => 0);
}
