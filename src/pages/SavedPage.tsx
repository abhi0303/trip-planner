import { useState } from 'react';
import { flatten, useCollections, useSavedTrips } from '@/api/queries';
import { savedApi } from '@/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { keys } from '@/api/queries';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Bits';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ErrorState, LoadMore, PageTitle } from '@/components/layout/States';
import { TripGrid } from '@/components/trip/TripCard';
import { useToast } from '@/components/ui/Toast';
import { COLLECTION_ICONS, collectionIcon } from '@/lib/labels';

export function SavedPage() {
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const collections = useCollections();
  const saved = useSavedTrips(collectionId);
  const trips = flatten(saved.data);

  return (
    <div>
      <PageTitle
        eyebrow="Your shelf"
        title="Saved trips"
        subtitle="Other people's experiences, kept for when you plan yours."
        action={
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} /> Collection
          </Button>
        }
      />

      {!!collections.data?.length && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar sm:mx-0 sm:px-0">
          <FolderChip
            label="Everything"
            icon="saved"
            active={!collectionId}
            onClick={() => setCollectionId(undefined)}
          />
          {collections.data.map((collection) => (
            <FolderChip
              key={collection.id}
              label={collection.name}
              icon={collectionIcon(collection.emoji)}
              count={collection.itemCount}
              active={collectionId === collection.id}
              onClick={() => setCollectionId(collection.id)}
            />
          ))}
        </div>
      )}

      {saved.isError ? (
        <ErrorState error={saved.error} onRetry={() => saved.refetch()} />
      ) : trips.length === 0 && !saved.isLoading ? (
        <EmptyState
          icon="bookmark"
          title="Nothing saved yet"
          body="Save a trip from anywhere in the app and it lands here."
          action={<Button to="/explore">Explore trips</Button>}
        />
      ) : (
        <>
          <TripGrid trips={trips} loading={saved.isLoading} skeletons={4} />
          <LoadMore onVisible={() => saved.fetchNextPage()} hasMore={!!saved.hasNextPage} loading={saved.isFetchingNextPage} />
        </>
      )}

      <NewCollectionModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function FolderChip({
  label, icon, count, active, onClick,
}: {
  label: string;
  icon: IconName;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-pill px-4 text-[13px] font-medium',
        'transition-all duration-200 ease-spring active:scale-95',
        active
          ? 'gradient-brand text-white shadow-[0_4px_14px_-6px_rgb(var(--c-brand)/0.8)]'
          : 'bg-surface text-ink-soft ring-1 ring-inset ring-line hover:text-ink hover:ring-brand/40',
      )}
    >
      <Icon name={icon} size={15} />
      {label}
      {count !== undefined && <span className="tnum opacity-70">{count}</span>}
    </button>
  );
}

function NewCollectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(COLLECTION_ICONS[0].token);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await savedApi.createCollection({ name: name.trim(), emoji: icon });
      queryClient.invalidateQueries({ queryKey: keys.collections });
      toast('Collection created', 'success');
      setName('');
      onClose();
    } catch (error: any) {
      toast(error?.message ?? 'Could not create that', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New collection"
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} full>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!name.trim()} full>Create</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          {(id) => (
            <Input id={id} value={name} onChange={(event) => setName(event.target.value)} placeholder="Goa plans" maxLength={60} />
          )}
        </Field>
        <Field label="Icon">
          {() => (
            <div className="flex flex-wrap gap-1.5">
              {COLLECTION_ICONS.map((option) => (
                <button
                  key={option.token}
                  type="button"
                  onClick={() => setIcon(option.token)}
                  aria-pressed={icon === option.token}
                  aria-label={option.label}
                  title={option.label}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-xl transition-all duration-200 ease-spring active:scale-90',
                    icon === option.token
                      ? 'gradient-brand text-white shadow-[0_4px_14px_-6px_rgb(var(--c-brand)/0.8)]'
                      : 'bg-sunk text-ink-soft ring-1 ring-inset ring-line-soft hover:text-ink',
                  )}
                >
                  <Icon name={option.icon} size={18} />
                </button>
              ))}
            </div>
          )}
        </Field>
      </div>
    </Modal>
  );
}
