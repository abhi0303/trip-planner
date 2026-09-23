import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTrip, useSaveTripMutation } from '@/api/queries';
import { mediaApi } from '@/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { track } from '@/lib/busy';
import { ApiError } from '@/api/client';
import { tripsApi } from '@/api/endpoints';
import { cn } from '@/lib/cn';
import { duration, formatDateRange, travelers } from '@/lib/format';
import { CROWD_META, SEASON_META, VISIBILITY_META, WEATHER_META, styleMeta } from '@/lib/labels';
import { Avatar, Badge, Skeleton } from '@/components/ui/Bits';
import { meshGradient } from '@/lib/visual';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/layout/States';
import { ExpenseHidden, ExpensePanel } from '@/components/trip/ExpensePanel';
import {
  ExperienceNotes, Itinerary, PhotoGrid, PlacesRoute, RatingGroups, RealityChecks, Stays,
} from '@/components/trip/TripSections';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';

export function TripDetailPage() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { signedIn } = useAuth();
  const trip = useTrip(idOrSlug);
  const save = useSaveTripMutation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  /**
   * Photo edits change the trip's cover, so every surface that renders one has
   * to refetch — not just this page.
   */
  const refreshPhotos = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trip'] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [queryClient]);

  const runPhotoAction = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      try {
        await track(action());
        refreshPhotos();
        toast(success, 'success');
      } catch (error) {
        toast(error instanceof ApiError ? error.message : 'That did not work', 'error');
      }
    },
    [refreshPhotos, toast],
  );

  if (trip.isLoading) return <TripDetailSkeleton />;
  if (trip.isError) return <ErrorState error={trip.error} onRetry={() => trip.refetch()} />;
  if (!trip.data) return null;

  const t = trip.data;

  const onSave = () => {
    if (!signedIn) return toast('Sign in to save this trip');
    save.mutate({ tripId: t.id, saved: !!t.isSaved });
  };

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ url, title: t.title }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    }
  };

  return (
    <article className="mx-auto w-full max-w-3xl">
      {/* ------------------------------------------------------------ hero */}
      <header className="mb-6">
        {/* Full-bleed cover; a trip without a photo still gets real artwork. */}
        <div className="relative -mx-4 mb-7 aspect-[16/9] overflow-hidden bg-sunk sm:mx-0 sm:aspect-[21/9] sm:rounded-xl2">
          {t.coverMedia ? (
            <img src={t.coverMedia.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundImage: meshGradient(t.id) }} aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" aria-hidden />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="glass"><Icon name="pin" size={11} />{t.destination}</Badge>
              {t.season && (
                <Badge tone="glass" className="capitalize">
                  <Icon name={SEASON_META[t.season].icon} size={11} />
                  {SEASON_META[t.season].label}
                </Badge>
              )}
              {t.status === 'DRAFT' && <Badge tone="warn">Draft</Badge>}
            </div>
            <h1 className="max-w-3xl text-[32px] font-bold leading-[1.05] tracking-tight text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] sm:text-[46px]">
              {t.title}
            </h1>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            to={`/explore?countryCode=${t.countryCode}`}
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-brand"
          >
            <Icon name="globe" size={14} />
            {[t.country, t.state].filter(Boolean).join(' · ')}
          </Link>
          {t.visibility !== 'PUBLIC' && (
            <Badge tone="neutral">
              <Icon name={VISIBILITY_META[t.visibility].icon} size={12} />
              {VISIBILITY_META[t.visibility].label}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-ink-soft">
          <span className="tnum flex items-center gap-1.5">
            <Icon name="calendar" size={15} />
            {formatDateRange(t.startDate, t.endDate)}
          </span>
          <span className="tnum">{duration(t.nights, t.days)}</span>
          <span className="tnum flex items-center gap-1.5">
            <Icon name="users" size={15} />
            {travelers(t.travelerCount)}
          </span>
          {t.season && (
            <span className="flex items-center gap-1.5">
              <Icon name={SEASON_META[t.season].icon} size={15} />
              {SEASON_META[t.season].label}
            </span>
          )}
          {t.weather && (
            <span className="flex items-center gap-1.5">
              <Icon name={WEATHER_META[t.weather].icon} size={15} />
              {WEATHER_META[t.weather].label}
            </span>
          )}
          {t.crowdLevel && (
            <span className="flex items-center gap-1.5">
              <CrowdMeter level={t.crowdLevel} />
              {CROWD_META[t.crowdLevel].label} crowds
            </span>
          )}
        </div>

        {t.travelStyles.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {t.travelStyles.map((style) => {
              const meta = styleMeta(style);
              return (
                <Badge key={style} tone="brand" className="px-3 py-1">
                  <Icon name={meta.icon} size={13} /> {meta.label}
                </Badge>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------ byline */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-inset ring-line-soft">
          <Avatar user={t.user} size="md" />
          <div className="min-w-0 flex-1">
            <Link to={`/@${t.user.username}`} className="block truncate text-sm font-semibold hover:text-brand">
              {t.user.name}
            </Link>
            <p className="truncate text-xs text-ink-faint">@{t.user.username}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {t.isOwner ? (
              <>
                <Button to={`/trips/${t.id}/edit`} variant="outline" size="sm">
                  <Icon name="edit" size={15} /> Edit
                </Button>
                {t.status === 'DRAFT' ? (
                  <PublishButton tripId={t.id} onDone={() => trip.refetch()} />
                ) : (
                  <Button to={`/posts/new?tripId=${t.id}`} size="sm" shine>
                    <Icon name="send" size={15} /> Share to feed
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={onShare} aria-label="Share">
                  <Icon name="share" size={17} />
                </Button>
                <Button
                  variant={t.isSaved ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={onSave}
                >
                  <Icon name="bookmark" size={15} filled={!!t.isSaved} />
                  {t.isSaved ? 'Saved' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------- sections */}
      <div className="space-y-10">
        {t.expenses ? <ExpensePanel summary={t.expenses} /> : <ExpenseHidden />}

        <PlacesRoute places={t.places} trip={t} />
        <ExperienceNotes trip={t} />
        <RealityChecks checks={t.realityChecks} />
        <Stays stays={t.stays} />
        <Itinerary days={t.itinerary} />
        <RatingGroups groups={t.ratings} />
        <PhotoGrid
          photos={t.photos}
          trip={t}
          owner={
            t.isOwner
              ? {
                  uploading,
                  onUpload: async (files) => {
                    setUploading(true);
                    try {
                      const media = await track(mediaApi.upload(files));
                      await track(tripsApi.addPhotos(t.id, media.map((item) => ({ mediaId: item.id }))));
                      refreshPhotos();
                      toast(files.length > 1 ? `${files.length} photos added` : 'Photo added', 'success');
                    } catch (error) {
                      toast(error instanceof ApiError ? error.message : 'Upload failed', 'error');
                    } finally {
                      setUploading(false);
                    }
                  },
                  onRemove: (photoId) =>
                    runPhotoAction(() => tripsApi.removePhoto(t.id, photoId), 'Photo removed'),
                  onSetCover: (photoId, mediaId) =>
                    runPhotoAction(() => tripsApi.setPhotoCover(t.id, photoId, mediaId), 'Cover updated'),
                }
              : undefined
          }
        />

        {/* ---------------------------------------------- plan like this */}
        <section className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-brand/12 to-brand-2/12 p-6 ring-1 ring-inset ring-brand/25">
          <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/25 blur-3xl" aria-hidden />
          <h2 className="text-xl font-bold tracking-tight">Plan a trip like this</h2>
          <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-soft">
            Start a new trip pre-filled from this one — same destination, dates shifted
            to you. Treat the figures as an estimate from {formatDateRange(t.startDate, t.endDate)},
            not a current quote.
          </p>
          <Button
            className="mt-3.5"
            onClick={() => {
              if (!signedIn) return toast('Sign in to plan a trip');
              navigate(`/create?from=${t.id}`);
            }}
          >
            <Icon name="sparkle" size={16} /> Use as a template
          </Button>
        </section>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft pt-4 text-xs text-ink-faint">
          <span className="tnum">{t.viewCount} views</span>
          <span className="tnum">{t.saveCount} saves</span>
          {t.publishedAt && <span>Published {formatDateRange(t.publishedAt.slice(0, 10), t.publishedAt.slice(0, 10)).split(' – ')[0]}</span>}
        </footer>
      </div>
    </article>
  );
}

function PublishButton({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const toast = useToast();

  const publish = async () => {
    setBusy(true);
    setProblems([]);
    try {
      await tripsApi.publish(tripId);
      toast('Trip published', 'success');
      onDone();
    } catch (error: any) {
      // A failed publish returns a user-ready checklist — render it as-is.
      if (error?.code === 'TRIP_INCOMPLETE' && error.problems?.length) {
        setProblems(error.problems);
      } else {
        toast(error?.message ?? 'Could not publish', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <Button size="sm" onClick={publish} loading={busy}>Publish</Button>
      {problems.length > 0 && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-warn/30 bg-surface p-3 shadow-lift">
          <p className="mb-1.5 text-[13px] font-semibold">Before publishing</p>
          <ul className="space-y-1 text-[13px] text-ink-soft">
            {problems.map((problem) => (
              <li key={problem} className="flex gap-1.5">
                <span className="text-warn">•</span>{problem}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CrowdMeter({ level }: { level: keyof typeof CROWD_META }) {
  const { bars } = CROWD_META[level];
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn('w-[3px] rounded-sm', step <= bars ? 'bg-ink-soft' : 'bg-line')}
          style={{ height: `${4 + step * 2}px` }}
        />
      ))}
    </span>
  );
}

function TripDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Skeleton className="-mx-4 aspect-[16/10] sm:mx-0 sm:rounded-card" />
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-9 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
