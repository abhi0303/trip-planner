import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { mediaApi, tripsApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { keys, useTrip, useTripMeta } from '@/api/queries';
import { toDateInput } from '@/lib/format';
import { track } from '@/lib/busy';
import { cn } from '@/lib/cn';
import { Button, Spinner } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Bits';
import { StepNav, type StepNavItem } from './StepNav';
import { ErrorState } from '@/components/layout/States';
import { useToast } from '@/components/ui/Toast';
import type {
  CreateTripBody, ExpenseInput, RatingType, StayInput, TripDetail,
} from '@/api/types';
import {
  StepDates, StepDestination, StepExpenses, StepExperience, StepItinerary, StepPhotos,
  StepPlaces, StepPrivacy, StepRatings, StepStay, StepStyles, StepTravelers,
} from './steps';

const STEPS = [
  { id: 'destination', label: 'Destination' },
  { id: 'dates', label: 'Dates' },
  { id: 'travelers', label: 'Travellers' },
  { id: 'styles', label: 'Trip style' },
  { id: 'places', label: 'Places' },
  { id: 'itinerary', label: 'Day by day' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'stay', label: 'Stay' },
  { id: 'photos', label: 'Photos' },
  { id: 'experience', label: 'Experience' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'privacy', label: 'Privacy' },
] as const;

/**
 * The trip exists as a DRAFT from step 3 onward, so every later step is its own
 * save and nothing is lost if the tab closes. There is no single submit.
 */
export function CreateTripPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const templateId = params.get('from');

  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const meta = useTripMeta();

  const [tripId, setTripId] = useState<string | undefined>(routeId);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<CreateTripBody>>({
    adults: 2, children: 0, infants: 0, currency: 'INR',
    expenseMode: 'DETAILED', visibility: 'PUBLIC', expenseVisibility: 'PUBLIC',
  });
  const [lines, setLines] = useState<ExpenseInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishProblems, setPublishProblems] = useState<string[]>([]);

  const trip = useTrip(tripId);
  const template = useTrip(templateId ?? undefined);

  // Editing an existing trip: hydrate the form once. `trip.data` gets a new
  // identity on every refetch, so re-running this would wipe whatever the user
  // had typed since.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!trip.data || !routeId || hydrated.current) return;
    hydrated.current = true;
    setDraft((current) => ({ ...current, ...pickBody(trip.data!) }));
    if (trip.data.expenses?.byCategory.length) {
      setLines(
        trip.data.expenses.byCategory.flatMap((entry) =>
          entry.subcategories.length
            ? entry.subcategories.map((sub) => ({
                category: entry.category, subcategory: sub.subcategory, amount: sub.amount,
              }))
            : [{ category: entry.category, amount: entry.amount }],
        ),
      );
    }
  }, [trip.data, routeId]);

  // "Plan a trip like this": copy the shape, drop the dates and the story.
  useEffect(() => {
    if (!template.data || routeId) return;
    const t = template.data;
    setDraft((current) => ({
      ...current,
      title: `${t.destination} trip`,
      countryCode: t.countryCode,
      country: t.country,
      state: t.state ?? undefined,
      destination: t.destination,
      destinationId: undefined,
      adults: t.adults,
      children: t.children,
      infants: t.infants,
      currency: t.currency,
      travelStyles: t.travelStyles,
    }));
    toast('Pre-filled from that trip — set your own dates');
  }, [template.data, routeId, toast]);

  const patch = useCallback((next: Partial<CreateTripBody>) => {
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  /**
   * Prefix invalidation, not `keys.trip(tripId)`: the detail screen is cached
   * under whatever it was opened with, so a trip reached by slug lives at
   * ['trip', slug] while the wizard only knows the id. Invalidating the exact
   * key left that entry stale.
   */
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trip'] });
  }, [queryClient]);

  /**
   * Deleting a photo can change the trip's cover — the API promotes the next
   * photo, or clears it when the last one goes. Every surface that renders a
   * cover has to refetch, or a card keeps pointing at a deleted object.
   */
  const refreshCovers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trip'] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  }, [queryClient]);

  // ---------------------------------------------------------------- saving

  /** Creates the draft on first save, then PATCHes on every later step. */
  const persist = useCallback(async (): Promise<string | undefined> => {
    setSaving(true);
    try {
      if (!tripId) {
        const created = await tripsApi.create(draft as CreateTripBody);
        setTripId(created.id);
        queryClient.setQueryData(keys.trip(created.id), created);
        return created.id;
      }
      const updated = await tripsApi.update(tripId, draft);
      queryClient.setQueryData(keys.trip(tripId), updated);
      return tripId;
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save', 'error');
      return undefined;
    } finally {
      setSaving(false);
    }
  }, [draft, tripId, queryClient, toast]);

  const destinationOk = !!(
    draft.title?.trim() && draft.countryCode && draft.country && draft.destination?.trim()
  );
  const datesOk = !!(draft.startDate && draft.endDate && draft.endDate >= draft.startDate);

  /**
   * Steps 1-3 build the draft; everything after them saves against a trip id,
   * so they only open once that id exists. Going back is always allowed.
   */
  const navSteps = useMemo<StepNavItem[]>(() =>
    STEPS.map((definition, index) => {
      let reachable = true;
      let reason: string | undefined;

      if (index <= step) {
        reachable = true;
      } else if (index === 1) {
        reachable = destinationOk;
        reason = 'Add a title and destination first';
      } else if (index === 2) {
        reachable = destinationOk && datesOk;
        reason = 'Add the destination and dates first';
      } else if (index > 2) {
        reachable = !!tripId || (destinationOk && datesOk);
        reason = 'Finish the destination and dates first';
      }

      const done =
        index < step ||
        (index === 0 && destinationOk) ||
        (index === 1 && datesOk);

      return { label: definition.label, reachable, reason, done };
    }),
  [step, destinationOk, datesOk, tripId]);

  const canAdvance = useMemo(() => {
    switch (STEPS[step].id) {
      case 'destination':
        return !!(draft.title?.trim() && draft.countryCode && draft.country && draft.destination?.trim());
      case 'dates':
        return !!(draft.startDate && draft.endDate && draft.endDate >= draft.startDate);
      default:
        return true;
    }
  }, [step, draft]);

  const next = async () => {
    // Steps 1-3 build the draft; from there on every step needs a trip id.
    if (step === 2 || (step > 2 && !tripId)) {
      const id = await persist();
      if (!id) return;
    } else if (tripId && ['styles', 'experience', 'privacy'].includes(STEPS[step].id)) {
      await persist();
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpTo = async (index: number) => {
    if (index === step) return;
    const target = navSteps[index];
    if (!target?.reachable) return;

    // Persist before leaving, so nothing typed on this step is lost — and so
    // the draft exists by the time a later step needs its id.
    if (index > 2 && !tripId) {
      if (!(await persist())) return;
    } else if (tripId) {
      await persist();
    }

    setStep(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const publish = async () => {
    if (!tripId) return;
    await persist();
    setPublishProblems([]);
    setSaving(true);
    try {
      const published = await tripsApi.publish(tripId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast('Trip published', 'success');
      navigate(`/trips/${published.slug}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TRIP_INCOMPLETE' && error.problems.length) {
        setPublishProblems(error.problems);
      } else {
        toast(error instanceof ApiError ? error.message : 'Could not publish', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const id = await persist();
    if (id) {
      toast('Saved as a draft', 'success');
      navigate(`/trips/${id}`);
    }
  };

  // ------------------------------------------------------ section actions

  /** `success` is passed for anything the user should get confirmation of. */
  const withRefresh = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await track(action());
      refresh();
      if (success) toast(success, 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'That did not work', 'error');
    }
  };

  const withCoverRefresh = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await track(action());
      refreshCovers();
      if (success) toast(success, 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'That did not work', 'error');
    }
  };

  const uploadPhotos = async (files: File[]) => {
    if (!tripId) return;
    setUploading(true);
    try {
      const media = await track(mediaApi.upload(files));
      // The API promotes the first attached photo to cover on its own, so the
      // client no longer sets coverMediaId here — doing so raced a stale read
      // and could overwrite a cover the user had already chosen.
      await track(tripsApi.addPhotos(tripId, media.map((item) => ({ mediaId: item.id }))));
      refreshCovers();
      toast(files.length > 1 ? `${files.length} photos added` : 'Photo added', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const saveExpenses = async () => {
    if (!tripId) return;
    if (draft.expenseMode === 'DETAILED') {
      const valid = lines.filter((line) => line.amount > 0);
      if (valid.length) await withRefresh(() => tripsApi.replaceExpenses(tripId, valid), 'Expenses saved');
    } else {
      await persist();
    }
  };

  if (routeId && trip.isLoading) {
    return <div className="flex justify-center py-20"><Spinner className="h-6 w-6 text-brand" /></div>;
  }
  if (routeId && trip.isError) {
    return <ErrorState error={trip.error} onRetry={() => trip.refetch()} />;
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const needsTrip = step > 3 && !tripId;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-8 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
      <StepNav
        steps={navSteps}
        current={step}
        onJump={jumpTo}
        className="mb-6 hidden lg:block lg:pt-1"
      />

      <div className="min-w-0">
      <header className="mb-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="eyebrow">Step {step + 1} of {STEPS.length} · {current.label}</p>
          <button
            onClick={saveDraft}
            disabled={!canAdvance || saving}
            className="text-[13px] font-medium text-ink-faint hover:text-ink disabled:opacity-40"
          >
            Save draft
          </button>
        </div>
        <ProgressBar value={((step + 1) / STEPS.length) * 100} />

        <h1 className="mt-4 text-2xl font-bold tracking-tight">{HEADINGS[current.id].title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{HEADINGS[current.id].subtitle}</p>
      </header>

      <div className="min-h-[280px]">
        {needsTrip ? (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-[13px] text-warn">
            Go back and finish the destination and dates first — they create the draft
            everything else attaches to.
          </p>
        ) : (
          <StepBody
            id={current.id}
            draft={draft}
            patch={patch}
            trip={trip.data}
            meta={meta.data}
            lines={lines}
            setLines={setLines}
            uploading={uploading}
            uploadPhotos={uploadPhotos}
            withRefresh={withRefresh}
            withCoverRefresh={withCoverRefresh}
            tripId={tripId}
          />
        )}
      </div>

      {publishProblems.length > 0 && (
        <div className="mt-5 rounded-xl border border-warn/30 bg-warn-soft p-4">
          <p className="mb-1.5 text-sm font-semibold text-warn">Before you can publish</p>
          <ul className="space-y-1 text-[13px] text-ink">
            {publishProblems.map((problem) => (
              <li key={problem} className="flex gap-2"><span className="text-warn">•</span>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="sticky bottom-14 z-10 -mx-4 mt-6 flex items-center gap-2 border-t border-line-soft bg-ground/95 px-4 py-3 backdrop-blur-md lg:bottom-0">
        {step > 0 && (
          <Button variant="ghost" onClick={back} disabled={saving}>
            <Icon name="chevronLeft" size={16} /> Back
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {current.id === 'expenses' && tripId && (
            <Button variant="outline" onClick={saveExpenses} loading={saving}>Save expenses</Button>
          )}
          {isLast ? (
            <Button onClick={publish} loading={saving} disabled={!tripId}>
              Publish trip
            </Button>
          ) : (
            <Button onClick={next} loading={saving} disabled={!canAdvance}>
              Continue <Icon name="chevronRight" size={16} />
            </Button>
          )}
        </div>
      </footer>
      </div>
    </div>
  );
}

const HEADINGS: Record<(typeof STEPS)[number]['id'], { title: string; subtitle: string }> = {
  destination: { title: 'Where did you go?', subtitle: 'Country, region and the destination as you would describe it.' },
  dates: { title: 'When were you there?', subtitle: 'Duration and season are worked out from these.' },
  travelers: { title: 'Who went?', subtitle: 'This is what every per-person figure divides by.' },
  styles: { title: 'What kind of trip was it?', subtitle: 'This is how travellers like you will find it.' },
  places: { title: 'Where did you actually go?', subtitle: 'Real places, in the order you visited them — each with the day you were there.' },
  itinerary: { title: 'How did each day run?', subtitle: 'Times here are what let someone else follow your trip hour by hour.' },
  expenses: { title: 'What did it cost?', subtitle: 'The part no other platform gives people.' },
  stay: { title: 'Where did you stay?', subtitle: 'Add one entry per hotel or stay.' },
  photos: { title: 'Show it', subtitle: 'The first one leads by default — pick another any time.' },
  experience: { title: 'What actually happened?', subtitle: 'The prompts produce far better writing than one empty box.' },
  ratings: { title: 'How was it?', subtitle: 'Rate the trip and each place on what matters there.' },
  privacy: { title: 'Who gets to see it?', subtitle: 'The trip and its spending are two separate switches.' },
};

function StepBody({
  id, draft, patch, trip, meta, lines, setLines, uploading, uploadPhotos,
  withRefresh, withCoverRefresh, tripId,
}: {
  id: (typeof STEPS)[number]['id'];
  draft: Partial<CreateTripBody>;
  patch: (next: Partial<CreateTripBody>) => void;
  trip: TripDetail | undefined;
  meta: ReturnType<typeof useTripMeta>['data'];
  lines: ExpenseInput[];
  setLines: (lines: ExpenseInput[]) => void;
  uploading: boolean;
  uploadPhotos: (files: File[]) => void;
  withRefresh: (action: () => Promise<unknown>, success?: string) => Promise<void>;
  withCoverRefresh: (action: () => Promise<unknown>, success?: string) => Promise<void>;
  tripId: string | undefined;
}) {
  switch (id) {
    case 'destination':
      return <StepDestination draft={draft} onChange={patch} />;
    case 'dates':
      return (
        <StepDates
          draft={draft}
          onChange={patch}
          derived={trip ? { nights: trip.nights, days: trip.days, season: trip.season } : undefined}
        />
      );
    case 'travelers':
      return <StepTravelers draft={draft} onChange={patch} />;
    case 'styles':
      return <StepStyles draft={draft} onChange={patch} />;
    case 'places':
      return trip ? (
        <StepPlaces
          trip={trip}
          onAdd={(placeId) => withRefresh(() => tripsApi.addPlace(trip.id, { placeId }), 'Place added')}
          onRemove={(tripPlaceId) => withRefresh(() => tripsApi.removePlace(trip.id, tripPlaceId), 'Place removed')}
          onReorder={(ids) => withRefresh(() => tripsApi.reorderPlaces(trip.id, ids))}
          onUpdate={(tripPlaceId, body) =>
            withRefresh(() => tripsApi.updatePlace(trip.id, tripPlaceId, body), 'Visit saved')
          }
        />
      ) : null;
    case 'itinerary':
      return trip ? (
        <StepItinerary
          trip={trip}
          onSaveDay={(dayNumber, body) =>
            withRefresh(() => tripsApi.upsertDay(trip.id, { dayNumber, ...body }), 'Day saved')
          }
          onAddActivity={(dayNumber, body) =>
            withRefresh(() => tripsApi.addActivity(trip.id, dayNumber, body), 'Added to the day')
          }
          onRemoveActivity={(activityId) =>
            withRefresh(() => tripsApi.removeActivity(trip.id, activityId), 'Removed')
          }
        />
      ) : null;
    case 'expenses':
      return trip ? (
        <StepExpenses
          trip={trip}
          meta={meta}
          mode={draft.expenseMode ?? 'DETAILED'}
          total={draft.totalExpense}
          lines={lines}
          onLinesChange={setLines}
          onModeChange={(mode) => patch({ expenseMode: mode })}
          onTotalChange={(total) => patch({ totalExpense: total })}
        />
      ) : null;
    case 'stay':
      return trip ? (
        <StepStay
          trip={trip}
          onAdd={(stay: StayInput) => withRefresh(() => tripsApi.addStay(trip.id, stay), 'Stay added')}
          onRemove={(stayId) => withRefresh(() => tripsApi.removeStay(trip.id, stayId), 'Stay removed')}
        />
      ) : null;
    case 'photos':
      return trip ? (
        <StepPhotos
          trip={trip}
          uploading={uploading}
          onUpload={uploadPhotos}
          onRemove={(photoId) => withCoverRefresh(() => tripsApi.removePhoto(trip.id, photoId), 'Photo removed')}
          onSetCover={(photoId, mediaId) =>
            withCoverRefresh(() => tripsApi.setPhotoCover(trip.id, photoId, mediaId), 'Cover updated')
          }
        />
      ) : null;
    case 'experience':
      return <StepExperience draft={draft} onChange={patch} />;
    case 'ratings':
      return trip ? (
        <StepRatings
          trip={trip}
          meta={meta}
          onSubmit={(ratingType: RatingType, placeId, scores) =>
            withRefresh(() =>
              tripsApi.submitRatings(trip.id, {
                ratingType,
                placeId,
                ratings: Object.entries(scores).map(([criteria, score]) => ({ criteria: criteria as never, score })),
              }),
            )
          }
          onAddRealityCheck={(text, severity) =>
            withRefresh(() => tripsApi.addRealityCheck(trip.id, { text, severity }), 'Reality check added')
          }
          onRemoveRealityCheck={(checkId) =>
            withRefresh(() => tripsApi.removeRealityCheck(trip.id, checkId), 'Reality check removed')
          }
        />
      ) : null;
    case 'privacy':
      return <StepPrivacy draft={draft} onChange={patch} />;
    default:
      return null;
  }
}

/** Only the fields POST/PATCH /trips actually declares — the API rejects extras. */
function pickBody(trip: TripDetail): Partial<CreateTripBody> {
  return {
    title: trip.title,
    countryCode: trip.countryCode,
    country: trip.country,
    state: trip.state ?? undefined,
    destination: trip.destination,
    startDate: toDateInput(trip.startDate),
    endDate: toDateInput(trip.endDate),
    adults: trip.adults,
    children: trip.children,
    infants: trip.infants,
    expenseMode: trip.expenses?.mode ?? 'TOTAL',
    totalExpense: trip.totalExpense ?? undefined,
    currency: trip.currency,
    travelStyles: trip.travelStyles,
    weather: trip.weather ?? undefined,
    crowdLevel: trip.crowdLevel ?? undefined,
    visibility: trip.visibility,
    expenseVisibility: trip.expenseVisibility,
    experience: trip.experience ?? undefined,
    enjoyedMost: trip.enjoyedMost ?? undefined,
    surprisedBy: trip.surprisedBy ?? undefined,
    wentWrong: trip.wentWrong ?? undefined,
    wouldDoDifferently: trip.wouldDoDifferently ?? undefined,
    adviceForTravelers: trip.adviceForTravelers ?? undefined,
  };
}
