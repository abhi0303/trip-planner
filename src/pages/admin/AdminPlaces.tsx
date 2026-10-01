import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminPlaces } from '@/api/queries';
import { adminApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { track } from '@/lib/busy';
import { cn } from '@/lib/cn';
import { placeIcon } from '@/lib/labels';
import { isAdmin } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import { Badge, EmptyState, Skeleton } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/layout/States';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PlacePicker } from '@/pages/wizard/PlacePicker';
import type { AdminPlace } from '@/api/types';

const FILTERS = [
  { key: 'missingCoordinates', label: 'No coordinates' },
  { key: 'unverified', label: 'Unverified' },
  { key: 'orphaned', label: 'Orphaned' },
] as const;

/**
 * The repair screen. Everything here exists because anyone signed in can create
 * a canonical place, so the catalogue accumulates typos, duplicates and rows
 * holding three beaches at once.
 */
export function AdminPlaces() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const { user } = useAuth();
  const admin = isAdmin(user);

  const filters = {
    q: params.get('q') || undefined,
    missingCoordinates: params.get('missingCoordinates') === '1' || undefined,
    unverified: params.get('unverified') === '1' || undefined,
    orphaned: params.get('orphaned') === '1' || undefined,
    limit: 25,
  };
  const places = useAdminPlaces(filters);

  const toggle = (key: string) => {
    const next = new URLSearchParams(params);
    if (next.get(key) === '1') next.delete(key);
    else next.set(key, '1');
    setParams(next, { replace: true });
  };

  const [merging, setMerging] = useState<AdminPlace | null>(null);
  const [removing, setRemoving] = useState<AdminPlace | null>(null);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = new URLSearchParams(params);
          if (q.trim()) next.set('q', q.trim()); else next.delete('q');
          setParams(next, { replace: true });
        }}
        className="relative"
      >
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search the catalogue"
          className="pl-10"
        />
      </form>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((filter) => {
          const on = params.get(filter.key) === '1';
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => toggle(filter.key)}
              className={cn(
                'shrink-0 rounded-pill border px-3 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-95',
                on ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line bg-surface text-ink-soft hover:text-ink',
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {places.isError ? (
        <ErrorState error={places.error} onRetry={() => places.refetch()} />
      ) : places.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[72px] rounded-xl2" />)}
        </div>
      ) : !places.data?.items.length ? (
        <EmptyState icon="pin" title="Nothing matches" body="No place in the catalogue fits those filters." />
      ) : (
        <ul className="space-y-2">
          {places.data.items.map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              canDestroy={admin}
              onMerge={() => setMerging(place)}
              onDelete={() => setRemoving(place)}
            />
          ))}
        </ul>
      )}

      {merging && <MergeDialog place={merging} onClose={() => setMerging(null)} />}
      {removing && <DeleteDialog place={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}

function PlaceRow({
  place, canDestroy, onMerge, onDelete,
}: {
  place: AdminPlace;
  canDestroy: boolean;
  onMerge: () => void;
  onDelete: () => void;
}) {
  const noCoords = place.latitude === null || place.longitude === null;

  return (
    <li>
      <Card className="flex items-center gap-3 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunk text-ink-soft">
          <Icon name={placeIcon(place.category)} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{place.name}</p>
          <p className="truncate text-xs text-ink-faint">
            {[place.state, place.country].filter(Boolean).join(' · ') || 'No region recorded'}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {noCoords && <Badge tone="warn">No coordinates</Badge>}
            {!place.isVerified && <Badge>Unverified</Badge>}
            {place.referenceCount === 0 && <Badge tone="warn">Orphaned</Badge>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMerge}
            aria-label={`Merge ${place.name} into another place`}
            title="Merge into another place"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
          >
            <Icon name="route" size={16} />
          </button>
          {canDestroy && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${place.name}`}
              title="Delete"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </Card>
    </li>
  );
}

/** Says plainly what merging does, because it deletes a row either way. */
function MergeDialog({ place, onClose }: { place: AdminPlace; onClose: () => void }) {
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  return (
    <Modal
      open
      onClose={() => !pending && onClose()}
      title="Merge into another place"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending} className="w-full sm:w-auto">Cancel</Button>
          <Button
            loading={pending}
            disabled={!target}
            className="w-full sm:w-auto"
            onClick={async () => {
              if (!target) return;
              setPending(true);
              try {
                await track(adminApi.mergePlace(place.id, { targetId: target.id }));
                await queryClient.invalidateQueries({ queryKey: ['admin'] });
                toast(`Merged into ${target.name}`, 'success');
                onClose();
              } catch (error) {
                toast(error instanceof ApiError ? error.message : 'Could not merge', 'error');
              } finally {
                setPending(false);
              }
            }}
          >
            <Icon name="route" size={16} /> Merge
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          Everything pointing at <strong className="text-ink">{place.name}</strong> — trips,
          visited places, stays, photos, ratings and posts — will point at the place you
          choose instead, and <strong className="text-ink">{place.name}</strong> will be deleted.
          This cannot be undone.
        </p>

        {target ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5">
            <Icon name="pin" size={15} className="text-brand" />
            <span className="flex-1 text-sm font-medium">{target.name}</span>
            <button type="button" onClick={() => setTarget(null)} className="text-xs font-medium text-ink-faint hover:text-ink">
              Change
            </button>
          </div>
        ) : (
          <PlacePicker
            country={{ countryCode: place.countryCode, country: place.country, state: place.state ?? undefined }}
            placeholder="Search for the place to keep…"
            onPick={(picked) => setTarget({ id: picked.id, name: picked.name })}
          />
        )}
      </div>
    </Modal>
  );
}

/** A delete that the server may refuse, which is the useful part. */
function DeleteDialog({ place, onClose }: { place: AdminPlace; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  if (blocked) {
    return (
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onClose}
        icon="warning"
        tone="brand"
        title="Still in use"
        body={`${blocked} Merge it into another place instead, which moves those references across first.`}
        confirmLabel="Close"
      />
    );
  }

  return (
    <ConfirmDialog
      open
      pending={pending}
      onClose={onClose}
      title={`Delete ${place.name}?`}
      body="The row goes for good. If anything still points at it the server will refuse, and merging is the way through."
      confirmLabel="Delete"
      onConfirm={async () => {
        setPending(true);
        try {
          await track(adminApi.deletePlace(place.id));
          await queryClient.invalidateQueries({ queryKey: ['admin'] });
          toast('Place deleted', 'success');
          onClose();
        } catch (error) {
          // 409 is the designed answer, not a failure: it carries the counts.
          if (error instanceof ApiError && error.status === 409) setBlocked(error.message);
          else toast(error instanceof ApiError ? error.message : 'Could not delete', 'error');
        } finally {
          setPending(false);
        }
      }}
    />
  );
}
