import { useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { track } from '@/lib/busy';
import { evictTrip } from '@/lib/offlineCache';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { TripCard } from '@/api/types';

type Pages<T> = { pages: Array<{ items: T[] }>; pageParams: unknown[] };

/** Drops matching items from every cached infinite list under `queryKey`. */
function dropFromLists<T>(queryClient: QueryClient, queryKey: unknown[], gone: (item: T) => boolean) {
  queryClient.setQueriesData<Pages<T>>({ queryKey }, (old) => {
    if (!old?.pages) return old;
    return { ...old, pages: old.pages.map((page) => ({ ...page, items: page.items.filter((item) => !gone(item)) })) };
  });
}

/**
 * Everything a deleted trip leaves behind in the cache. The server removes the
 * trip, its photos, the posts shared from it and every save of either, so the
 * lists lose it at once and every count that could have moved is refetched.
 */
function purgeTrip(queryClient: QueryClient, trip: Pick<TripCard, 'id' | 'slug'>) {
  const isTrip = (item: { id: string }) => item.id === trip.id;
  const fromTrip = (post: { trip: { id: string } | null }) => post.trip?.id === trip.id;

  // Straight off screen, before any refetch lands.
  dropFromLists(queryClient, ['trips'], isTrip);
  dropFromLists(queryClient, ['saved'], isTrip);
  dropFromLists(queryClient, ['search'], isTrip);
  dropFromLists(queryClient, ['place'], isTrip);
  dropFromLists(queryClient, ['feed'], fromTrip);
  queryClient.removeQueries({ queryKey: ['trip', trip.id] });
  queryClient.removeQueries({ queryKey: ['trip', trip.slug] });
  // And off the device, or it returns on the next offline start.
  void evictTrip(trip);

  // Then the truth: lists, profile counts and travel map, saves and collections.
  for (const key of ['trips', 'feed', 'post', 'user', 'saved', 'collections', 'search', 'place']) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/** Permanently deletes a trip. A 404 means it is already gone, which is the outcome we wanted. */
export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const remove = async (trip: Pick<TripCard, 'id' | 'slug'>) => {
    setPending(true);
    try {
      await track(tripsApi.remove(trip.id));
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        toast(error instanceof ApiError ? error.message : 'Could not delete that trip', 'error');
        setPending(false);
        return false;
      }
    }
    // A tick later, so a caller on the trip's own page navigates away first
    // rather than refetching the trip it just deleted and flashing a 404.
    window.setTimeout(() => purgeTrip(queryClient, trip), 0);
    toast('Trip deleted', 'success');
    setPending(false);
    return true;
  };

  return { remove, pending };
}

/** The confirmation. Says plainly what goes with the trip, because none of it comes back. */
export function DeleteTripDialog({
  trip, open, onClose, onDeleted,
}: {
  trip: Pick<TripCard, 'id' | 'slug' | 'title'>;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { remove, pending } = useDeleteTrip();

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={async () => {
              if (await remove(trip)) {
                onClose();
                onDeleted?.();
              }
            }}
          >
            <Icon name="trash" size={16} /> Delete trip
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger ring-1 ring-inset ring-danger/20">
          <Icon name="trash" size={24} />
        </span>
        <h2 className="font-display text-lg font-semibold">Delete this trip?</h2>
        <p className="mt-1.5 font-medium text-ink">&ldquo;{trip.title}&rdquo;</p>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          Its photos and any posts you shared from it will be permanently deleted,
          along with their likes, comments and saves. This can&rsquo;t be undone.
        </p>
      </div>
    </Modal>
  );
}
