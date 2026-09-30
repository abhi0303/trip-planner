import { CACHE_VERSION, OUTBOX_STORE, idb, usable, type OutboxRecord } from './offlineDb';
import type { CreateTripBody, ExpenseInput, PlaceSummary } from '@/api/types';

/**
 * The trip wizard's in-progress state, kept on the device.
 *
 * The wizard is otherwise server-backed: it creates a draft trip on the first
 * save and every later step PATCHes against the id that came back. That is the
 * right design online and useless on a plane, where the first save cannot
 * happen at all and a reload loses everything typed.
 *
 * So the form itself is persisted locally and replayed as an ordinary create
 * once the server answers. Nothing here is a queued API call — there is no
 * temporary id to reconcile and no half-created trip to clean up if the tab
 * closes mid-flight.
 */

export interface DraftPayload {
  draft: Partial<CreateTripBody>;
  destinations: PlaceSummary[];
  lines: ExpenseInput[];
  step: number;
}

const ID = 'wizard-draft';

/** Enough to create the trip server-side; below this it is only a saved form. */
export function sendable(payload: DraftPayload): boolean {
  const { draft, destinations } = payload;
  return !!(
    draft.title?.trim()
    && draft.countryCode
    && draft.country
    && draft.startDate
    && draft.endDate
    && destinations.length > 0
  );
}

export async function saveDraft(userId: string, payload: DraftPayload): Promise<void> {
  const record: OutboxRecord = {
    id: ID,
    userId,
    savedAt: Date.now(),
    version: CACHE_VERSION,
    kind: 'create-trip',
    payload,
  };
  await idb.put(OUTBOX_STORE, record);
}

export async function readDraft(userId: string): Promise<{ payload: DraftPayload; savedAt: number } | null> {
  const record = await idb.get<OutboxRecord>(OUTBOX_STORE, ID);
  if (!usable(record, userId)) return null;
  return { payload: record!.payload as DraftPayload, savedAt: record!.savedAt };
}

export const clearDraft = () => idb.del(OUTBOX_STORE, ID);
