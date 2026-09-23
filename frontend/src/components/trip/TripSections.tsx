import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatDate, minutes, money } from '@/lib/format';
import { activityMeta, criteriaLabel, isCoverPhoto, placeIcon, placeLine, severityMeta } from '@/lib/labels';
import { placeVisits, timeRange, type PlaceVisit } from '@/lib/itinerary';
import { Badge, Stars } from '@/components/ui/Bits';
import { Spinner } from '@/components/ui/Button';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { PhotoViewer } from './PhotoViewer';
import { Icon, IconTile } from '@/components/ui/Icon';
import type {
  RatingGroup, RealityCheck, TripDay, TripDetail, TripPhoto, TripPlace, TripStay,
} from '@/api/types';

// ------------------------------------------------------------ places / route

/**
 * One visit line: "Day 2 · Sat, 15 Aug · 09:30 – 12:00 · Sunset walk". The
 * clock times come from the itinerary — a trip place carries a date and no
 * more — so a trip without a day-by-day plan degrades to just the date.
 */
function VisitLine({ visit }: { visit: PlaceVisit }) {
  const time = timeRange(visit.startTime, visit.endTime);

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {visit.dayNumber !== null && (
        <span className="tnum shrink-0 font-semibold text-ink-soft">Day {visit.dayNumber}</span>
      )}
      {visit.date && <span className="tnum text-ink-faint">{formatDate(visit.date)}</span>}
      {time && (
        <span className="tnum inline-flex items-center gap-1 font-medium text-brand">
          <Icon name="clock" size={11} />
          {time}
        </span>
      )}
      {visit.label && <span className="truncate text-ink-faint">{visit.label}</span>}
    </span>
  );
}

const VISITS_SHOWN = 3;

/** Every time this place appears, collapsed past three. */
function Visits({
  entry, trip,
}: {
  entry: TripPlace;
  trip: Pick<TripDetail, 'startDate' | 'itinerary'>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visits = placeVisits(trip, entry);
  if (!visits.length) return null;

  const shown = expanded ? visits : visits.slice(0, VISITS_SHOWN);
  const hidden = visits.length - shown.length;

  return (
    <div className="mt-1.5 space-y-1 text-xs">
      {shown.map((visit, index) => (
        <VisitLine key={`${visit.dayNumber}-${visit.startTime}-${index}`} visit={visit} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tnum font-medium text-ink-faint hover:text-ink"
        >
          +{hidden} more {hidden === 1 ? 'visit' : 'visits'}
        </button>
      )}
    </div>
  );
}

/** Places in sequence — the trip route, without a map dependency. */
export function PlacesRoute({
  places, trip,
}: {
  places: TripPlace[];
  trip: Pick<TripDetail, 'startDate' | 'itinerary'>;
}) {
  if (!places.length) return null;

  return (
    <section aria-labelledby="places-heading">
      <h2 id="places-heading" className="mb-4 text-[22px] font-bold tracking-tight">
        Places visited
        <span className="ml-2 text-sm font-normal text-ink-faint tnum">{places.length}</span>
      </h2>

      <ol className="relative space-y-1">
        {places.map((entry, index) => (
          <li key={entry.id} className="relative flex gap-3.5 pb-1">
            <div className="flex flex-col items-center">
              <IconTile name={placeIcon(entry.place.category)} size="sm" className="rounded-full" />
              {index < places.length - 1 && <span className="mt-1 w-px flex-1 bg-line" aria-hidden />}
            </div>

            <div className="min-w-0 flex-1 pb-4">
              <Link to={`/places/${entry.place.slug}`} className="text-[15px] font-semibold hover:text-brand">
                {entry.place.name}
              </Link>
              <p className="text-xs text-ink-faint">{placeLine(entry.place)}</p>

              <Visits entry={entry} trip={trip} />

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                {entry.durationMinutes !== null && (
                  <span className="tnum inline-flex items-center gap-1">
                    <Icon name="clock" size={12} />
                    {minutes(entry.durationMinutes)} spent here
                  </span>
                )}
                {entry.place.experienceCount > 0 && (
                  <Link to={`/places/${entry.place.slug}`} className="text-brand hover:underline tnum">
                    {entry.place.experienceCount} experiences
                  </Link>
                )}
              </div>

              {entry.notes && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{entry.notes}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// -------------------------------------------------------------------- stays

export function Stays({ stays }: { stays: TripStay[] }) {
  if (!stays.length) return null;

  return (
    <section aria-labelledby="stays-heading">
      <h2 id="stays-heading" className="mb-4 text-[22px] font-bold tracking-tight">Where they stayed</h2>
      <div className="space-y-3">
        {stays.map((stay) => (
          <div key={stay.id} className="rounded-card bg-surface p-4 ring-1 ring-inset ring-line-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold">{stay.hotelName}</h3>
                {(stay.location || stay.place) && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                    <Icon name="pin" size={12} />
                    {stay.location ?? stay.place?.name}
                  </p>
                )}
              </div>
              {stay.rating !== null && (
                <span className="flex shrink-0 items-center gap-1.5">
                  <Stars value={stay.rating} size={13} />
                  <span className="tnum text-xs font-medium">{stay.rating.toFixed(1)}</span>
                </span>
              )}
            </div>

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
              {stay.checkIn && stay.checkOut && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-faint">Stayed</dt>
                  <dd className="tnum font-medium">
                    {formatDate(stay.checkIn, false)} – {formatDate(stay.checkOut)}
                    {stay.nights !== null && ` · ${stay.nights}n`}
                  </dd>
                </div>
              )}
              {stay.roomType && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-faint">Room</dt>
                  <dd className="font-medium">{stay.roomType}</dd>
                </div>
              )}
              <div className="flex gap-1.5">
                <dt className="text-ink-faint">Cost</dt>
                <dd className={cn('tnum font-semibold', stay.amount === null && 'font-normal text-ink-faint')}>
                  {stay.amount === null ? 'Hidden' : money(stay.amount, stay.currency)}
                </dd>
              </div>
              {stay.bookingPlatform && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-faint">Booked via</dt>
                  <dd className="font-medium">{stay.bookingPlatform}</dd>
                </div>
              )}
            </dl>

            {stay.notes && <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{stay.notes}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ ratings

/** One block per rated target, each criterion shown as its own meter. */
export function RatingGroups({ groups }: { groups: RatingGroup[] }) {
  if (!groups.length) return null;

  return (
    <section aria-labelledby="ratings-heading">
      <h2 id="ratings-heading" className="mb-4 text-[22px] font-bold tracking-tight">How they rated it</h2>
      <div className="space-y-4">
        {groups.map((group, index) => (
          <div key={`${group.ratingType}-${group.place?.id ?? group.stayId ?? index}`}
            className="rounded-card bg-surface p-4 ring-1 ring-inset ring-line-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">{group.ratingType.toLowerCase()}</p>
                <h3 className="text-[15px] font-semibold">
                  {group.place ? (
                    <Link to={`/places/${group.place.slug}`} className="hover:text-brand">{group.place.name}</Link>
                  ) : (
                    'The trip overall'
                  )}
                </h3>
              </div>
              <span className="flex shrink-0 items-center gap-1.5">
                <Stars value={group.average} size={14} />
                <span className="tnum text-sm font-semibold">{group.average.toFixed(1)}</span>
              </span>
            </div>

            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.entries(group.scores).map(([criteria, score]) => (
                <div key={criteria} className="flex items-center gap-2.5">
                  <dt className="w-28 shrink-0 truncate text-[13px] text-ink-soft">{criteriaLabel(criteria)}</dt>
                  <dd className="flex flex-1 items-center gap-2">
                    <span className="flex gap-[2px]" aria-hidden>
                      {[1, 2, 3, 4, 5].map((step) => (
                        <span
                          key={step}
                          className={cn('h-1.5 w-full min-w-[10px] rounded-sm', step <= score ? 'bg-ember' : 'bg-sunk')}
                        />
                      ))}
                    </span>
                    <span className="tnum w-3 shrink-0 text-xs font-medium">{score}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------------- reality checks

/** The signature feature: practical warnings, not complaints. */
export function RealityChecks({ checks }: { checks: RealityCheck[] }) {
  if (!checks.length) return null;

  return (
    <section aria-labelledby="reality-heading">
      <h2 id="reality-heading" className="mb-1 text-[22px] font-bold tracking-tight">Reality check</h2>
      <p className="mb-4 text-[13px] text-ink-soft">Things this traveller wishes they had known first.</p>

      <ul className="space-y-2">
        {checks.map((check) => {
          const meta = severityMeta(check.severity);
          return (
            <li key={check.id} className={cn('flex gap-3 rounded-2xl p-4 ring-1 ring-inset', meta.ring)}>
              <Icon name={meta.icon} size={18} className={cn('mt-px', meta.className)} />
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-ink">{check.text}</p>
                {check.place && (
                  <Link to={`/places/${check.place.slug}`} className="mt-1 inline-block text-xs font-medium hover:underline">
                    {check.place.name}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- itinerary

export function Itinerary({ days }: { days: TripDay[] }) {
  const withContent = days.filter((day) => day.activities.length > 0 || day.title || day.summary);
  if (!withContent.length) return null;

  return (
    <section aria-labelledby="itinerary-heading">
      <h2 id="itinerary-heading" className="mb-4 text-[22px] font-bold tracking-tight">Day by day</h2>

      <div className="space-y-5">
        {withContent.map((day) => (
          <div key={day.id}>
            <div className="mb-2 flex items-baseline gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-2xs font-bold text-ground tnum">
                {day.dayNumber}
              </span>
              <h3 className="text-[15px] font-semibold">{day.title ?? `Day ${day.dayNumber}`}</h3>
              {day.date && <span className="tnum ml-auto text-xs text-ink-faint">{formatDate(day.date)}</span>}
            </div>

            {day.summary && <p className="mb-2 pl-10 text-[13px] leading-relaxed text-ink-soft">{day.summary}</p>}

            <ul className="ml-3.5 space-y-0 border-l border-line pl-6">
              {day.activities.map((activity) => {
                const meta = activityMeta(activity.kind);
                return (
                  <li key={activity.id} className="relative py-1.5">
                    <span className="absolute -left-[34px] top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-ground text-ink-faint ring-1 ring-line-soft">
                      <Icon name={meta.icon} size={12} />
                    </span>
                    <div className="flex items-baseline gap-2">
                      {activity.startTime && (
                        <span className="tnum shrink-0 text-xs font-medium text-ink-faint">{activity.startTime}</span>
                      )}
                      <span className="text-sm font-medium">{activity.title}</span>
                      {activity.place && (
                        <Link to={`/places/${activity.place.slug}`} className="truncate text-xs text-brand hover:underline">
                          {activity.place.name}
                        </Link>
                      )}
                    </div>
                    {activity.notes && <p className="mt-0.5 text-[13px] text-ink-soft">{activity.notes}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- photos

export interface PhotoOwnerActions {
  onUpload: (files: File[]) => Promise<void> | void;
  onRemove: (photoId: string) => Promise<void> | void;
  onSetCover: (photoId: string, mediaId: string) => Promise<void> | void;
  uploading: boolean;
}

/**
 * The gallery. Owners get add, remove and cover controls inline, so routine
 * photo tidying never requires opening the edit wizard.
 */
export function PhotoGrid({
  photos, trip, owner,
}: {
  photos: TripPhoto[];
  trip: Pick<TripDetail, 'coverMedia'>;
  owner?: PhotoOwnerActions;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [ready, setReady] = useState<File[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  if (!photos.length && !owner) return null;

  const runOnPhoto = async (photoId: string, action: () => Promise<void> | void) => {
    setPendingPhoto(photoId);
    try {
      await action();
    } finally {
      setPendingPhoto(null);
    }
  };

  const finish = (all: File[]) => {
    setQueue([]);
    setReady([]);
    if (all.length) owner?.onUpload(all);
  };

  const advance = (file: File) => {
    const rest = queue.slice(1);
    const done = [...ready, file];
    if (rest.length) {
      setQueue(rest);
      setReady(done);
    } else {
      finish(done);
    }
  };

  return (
    <section aria-labelledby="photos-heading">
      <h2 id="photos-heading" className="mb-4 text-[22px] font-bold tracking-tight">
        Photos
        {photos.length > 0 && (
          <span className="ml-2 text-sm font-normal text-ink-faint tnum">{photos.length}</span>
        )}
      </h2>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {photos.map((photo, index) => {
          const cover = isCoverPhoto(photo, trip);
          const pending = pendingPhoto === photo.id;

          return (
            <div
              key={photo.id}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg bg-sunk',
                'ring-2 transition-all duration-200',
                cover && owner ? 'ring-brand' : 'ring-transparent',
              )}
            >
              <button
                type="button"
                onClick={() => setViewing(index)}
                aria-label={`Open photo ${index + 1}`}
                className="block h-full w-full"
              >
                <img
                  src={photo.media.url}
                  alt={photo.caption ?? ''}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>

              {photo.place && !owner && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-2xs font-medium text-white">
                  {photo.place.name}
                </span>
              )}

              {owner && (
                <>
                  {cover ? (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-pill bg-brand px-2 py-0.5 text-2xs font-semibold text-white">
                      <Icon name="star" size={10} filled />
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => runOnPhoto(photo.id, () => owner.onSetCover(photo.id, photo.media.id))}
                      className="absolute inset-x-1.5 bottom-1.5 rounded-pill bg-black/60 py-1 text-2xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      Make cover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => runOnPhoto(photo.id, () => owner.onRemove(photo.id))}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Icon name="x" size={13} strokeWidth={2.4} />
                  </button>
                </>
              )}

              {pending && (
                <span className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[1px]">
                  <Spinner className="h-6 w-6 text-white" />
                </span>
              )}
            </div>
          );
        })}

        {owner && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={owner.uploading}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line text-ink-faint',
              'transition-colors hover:border-brand hover:text-brand disabled:opacity-60',
            )}
          >
            {owner.uploading ? <Spinner className="h-6 w-6 text-brand" /> : <Icon name="plus" size={22} />}
            <span className="text-2xs font-medium">{owner.uploading ? 'Uploading…' : 'Add photos'}</span>
          </button>
        )}
      </div>

      {owner && (
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []).slice(0, 20);
            event.target.value = '';
            if (files.length) {
              setReady([]);
              setQueue(files);
            }
          }}
        />
      )}

      {queue.length > 0 && (
        <ImageCropper
          key={`${queue[0].name}-${queue.length}`}
          file={queue[0]}
          aspect={4 / 3}
          outputWidth={1600}
          title={queue.length > 1 ? `Adjust photo — ${ready.length + 1} of ${ready.length + queue.length}` : 'Adjust photo'}
          skipLabel="Use original"
          onSkip={() => advance(queue[0])}
          onCancel={() => finish(ready)}
          onConfirm={advance}
        />
      )}

      {viewing !== null && photos.length > 0 && (
        <PhotoViewer
          photos={photos}
          startIndex={Math.min(viewing, photos.length - 1)}
          onClose={() => setViewing(null)}
        />
      )}
    </section>
  );
}

/** The optional long-form prompts, rendered only where the traveller answered. */
export function ExperienceNotes({
  trip,
}: {
  trip: {
    experience: string | null;
    enjoyedMost: string | null;
    surprisedBy: string | null;
    wentWrong: string | null;
    wouldDoDifferently: string | null;
    adviceForTravelers: string | null;
  };
}) {
  const prompts = [
    { label: 'What they enjoyed most', value: trip.enjoyedMost },
    { label: 'What surprised them', value: trip.surprisedBy },
    { label: 'What went wrong', value: trip.wentWrong },
    { label: 'What they would do differently', value: trip.wouldDoDifferently },
    { label: 'Advice for other travellers', value: trip.adviceForTravelers },
  ].filter((prompt) => prompt.value);

  if (!trip.experience && !prompts.length) return null;

  return (
    <section aria-labelledby="experience-heading">
      <h2 id="experience-heading" className="mb-4 text-[22px] font-bold tracking-tight">The experience</h2>

      {trip.experience && (
        <p className="whitespace-pre-line text-[15px] leading-[1.75] text-ink-soft">{trip.experience}</p>
      )}

      {prompts.length > 0 && (
        <dl className="mt-5 space-y-4 border-l-2 border-brand-soft pl-4">
          {prompts.map((prompt) => (
            <div key={prompt.label}>
              <dt className="eyebrow mb-1">{prompt.label}</dt>
              <dd className="text-[14px] leading-relaxed">{prompt.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
