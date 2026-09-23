import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { flatten, useMyTrips, useTrip } from '@/api/queries';
import { mediaApi, postsApi } from '@/api/endpoints';
import { track } from '@/lib/busy';
import { cn } from '@/lib/cn';
import { formatDateRange } from '@/lib/format';
import { VISIBILITY_META, placeIcon } from '@/lib/labels';
import { VISIBILITY, type Media, type TripCard, type Visibility } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Field, Textarea } from '@/components/ui/Field';
import { Icon, IconTile } from '@/components/ui/Icon';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/ui/Bits';
import { ErrorState } from '@/components/layout/States';
import { TripCardSkeleton } from '@/components/trip/TripCard';
import { useToast } from '@/components/ui/Toast';

const MAX_MEDIA = 20;
const MAX_CAPTION = 2200;

/**
 * A post is a share of a trip: the API takes a trip id, an optional place
 * inside it, a caption and a carousel of media ids. Photos already on the trip
 * are the normal source — uploading here is the exception, for a shot that
 * never made it into the trip itself.
 */
export function ComposePostPage() {
  const [params] = useSearchParams();
  const preselected = params.get('tripId') ?? undefined;
  const [tripId, setTripId] = useState<string | undefined>(preselected);

  return tripId
    ? <Compose tripId={tripId} onBack={preselected ? undefined : () => setTripId(undefined)} />
    : <TripChooser onPick={setTripId} />;
}

// ------------------------------------------------------------- trip chooser

function TripChooser({ onPick }: { onPick: (tripId: string) => void }) {
  const trips = useMyTrips();
  const all = useMemo(() => flatten<TripCard>(trips.data), [trips.data]);

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <PageHero
        eyebrow="New post"
        title="Which trip is this about?"
        lead="Posts are shared from a trip, so the feed card can carry its route, nights and real numbers."
      />

      {trips.isError ? (
        <ErrorState error={trips.error} onRetry={() => trips.refetch()} />
      ) : trips.isLoading ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          title="No trips yet"
          body="A post hangs off a trip, so record one first — it takes a few minutes."
          action={<Button to="/create" size="lg" shine><Icon name="plus" size={18} /> Create a trip</Button>}
        />
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {all.map((trip) => (
            <li key={trip.id}>
              <button
                type="button"
                onClick={() => onPick(trip.id)}
                className="flex w-full items-center gap-3 rounded-card bg-surface p-3 text-left ring-1 ring-inset ring-line-soft transition hover:ring-brand/40"
              >
                {trip.coverMedia ? (
                  <img
                    src={trip.coverMedia.thumbnailUrl ?? trip.coverMedia.url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <IconTile name="map" size="lg" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{trip.title}</span>
                  <span className="block truncate text-xs text-ink-faint">
                    {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="shrink-0 text-ink-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- composer

function Compose({ tripId, onBack }: { tripId: string; onBack?: () => void }) {
  const trip = useTrip(tripId);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [caption, setCaption] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const t = trip.data;
  // Trip photos first, then anything uploaded here — both are just media ids.
  const gallery: Media[] = useMemo(
    () => [...(t?.photos ?? []).map((photo) => photo.media), ...extra],
    [t?.photos, extra],
  );

  const toggle = (mediaId: string) => {
    setSelected((current) => {
      if (current.includes(mediaId)) return current.filter((id) => id !== mediaId);
      if (current.length >= MAX_MEDIA) {
        toast(`A post carries at most ${MAX_MEDIA} photos`, 'error');
        return current;
      }
      return [...current, mediaId];
    });
  };

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const media = await track(mediaApi.upload(files));
      setExtra((current) => [...current, ...media]);
      setSelected((current) => [...current, ...media.map((item) => item.id)].slice(0, MAX_MEDIA));
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!t) return;
    setPosting(true);
    try {
      const post = await track(postsApi.create({
        tripId: t.id,
        placeId: placeId || undefined,
        caption: caption.trim().slice(0, MAX_CAPTION) || undefined,
        // Omitted entirely when nothing is picked: the API falls back to the cover.
        mediaIds: selected.length ? selected : undefined,
        visibility,
      }));
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast('Posted', 'success');
      navigate(`/posts/${post.id}`, { replace: true });
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not post that', 'error');
    } finally {
      setPosting(false);
    }
  };

  if (trip.isError) return <ErrorState error={trip.error} onRetry={() => trip.refetch()} />;
  if (!t) return <TripCardSkeleton />;

  const cover = t.coverMedia;

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <PageHero
        eyebrow="New post"
        title="Share it to the feed"
        lead={`From “${t.title}”. The card carries the trip's route and numbers — the caption is yours.`}
        actions={
          onBack ? (
            <Button variant="outline" size="sm" onClick={onBack}>
              <Icon name="chevronRight" size={15} className="rotate-180" /> Different trip
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-5">
        <Field label="Caption" hint={`${caption.length}/${MAX_CAPTION}`}>
          {(id) => (
            <Textarea
              id={id}
              rows={4}
              value={caption}
              maxLength={MAX_CAPTION}
              placeholder="What should people know about this one?"
              onChange={(event) => setCaption(event.target.value)}
            />
          )}
        </Field>

        <div>
          <p className="mb-2 flex items-baseline justify-between text-sm font-semibold">
            Photos
            <span className="text-xs font-normal text-ink-faint tnum">
              {selected.length ? `${selected.length} selected, in tap order` : 'Uses the trip cover if you pick none'}
            </span>
          </p>

          {gallery.length === 0 && !cover ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-soft">
              This trip has no photos yet. Add one below, or post without.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {gallery.map((media) => {
                const order = selected.indexOf(media.id);
                return (
                  <li key={media.id}>
                    <button
                      type="button"
                      onClick={() => toggle(media.id)}
                      aria-pressed={order >= 0}
                      className={cn(
                        'relative block w-full overflow-hidden rounded-xl ring-2 transition',
                        order >= 0 ? 'ring-brand' : 'ring-transparent hover:ring-line',
                      )}
                    >
                      <img
                        src={media.thumbnailUrl ?? media.url}
                        alt=""
                        className={cn('aspect-square w-full object-cover transition', order >= 0 && 'brightness-90')}
                      />
                      <span
                        className={cn(
                          'absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-2xs font-bold tnum ring-1',
                          order >= 0
                            ? 'bg-brand text-white ring-brand'
                            : 'bg-black/35 text-white/90 ring-white/40',
                        )}
                      >
                        {order >= 0 ? order + 1 : ''}
                      </span>
                    </button>
                  </li>
                );
              })}

              <li>
                <label
                  className={cn(
                    'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl',
                    'border border-dashed border-line text-ink-faint transition hover:border-brand hover:text-brand',
                    uploading && 'pointer-events-none opacity-60',
                  )}
                >
                  <Icon name={uploading ? 'spinner' : 'plus'} size={20} className={cn(uploading && 'animate-spin')} />
                  <span className="text-2xs font-medium">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      upload(Array.from(event.target.files ?? []));
                      event.target.value = '';
                    }}
                  />
                </label>
              </li>
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="About one place?" hint="optional">
            {(id) => (
              <Dropdown
                id={id}
                placeholder={t.places.length ? 'The whole trip' : 'No places on this trip'}
                value={placeId || 'none'}
                onChange={(next) => setPlaceId(next === 'none' ? '' : next)}
                options={[
                  { value: 'none', label: 'The whole trip' },
                  ...t.places.map((entry) => ({
                    value: entry.place.id,
                    label: entry.place.name,
                    icon: placeIcon(entry.place.category),
                  })),
                ]}
              />
            )}
          </Field>

          <Field label="Who can see it?">
            {(id) => (
              <Dropdown
                id={id}
                value={visibility}
                onChange={(next) => setVisibility(next as Visibility)}
                options={VISIBILITY.map((value) => ({
                  value,
                  label: VISIBILITY_META[value].label,
                  hint: VISIBILITY_META[value].hint,
                  icon: VISIBILITY_META[value].icon,
                }))}
              />
            )}
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={submit} loading={posting} disabled={uploading} shine>
            <Icon name="send" size={16} /> Post
          </Button>
        </div>
      </div>
    </div>
  );
}
