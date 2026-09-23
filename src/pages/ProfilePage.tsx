import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  flatten, useFollowList, useFollowMutation, useMyTrips, useTravelMap, useTrips, useUser,
} from '@/api/queries';
import { cn } from '@/lib/cn';
import { compactCount, formatDate } from '@/lib/format';
import { brandCover } from '@/lib/visual';
import { Avatar, Badge, EmptyState, Skeleton, Tabs } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { TripGrid } from '@/components/trip/TripCard';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';

type Tab = 'trips' | 'drafts' | 'map';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const handle = username?.replace(/^@/, '');
  const { user: me, signedIn } = useAuth();
  const toast = useToast();

  const profile = useUser(handle);

  /**
   * `isSelf` comes from the server, which decides it from the bearer token.
   * If the profile was fetched before the session settled — or served from a
   * cache entry created while signed out — it comes back false and the page
   * offers you a Follow button on your own profile. Confirming it against the
   * signed-in user makes that impossible.
   */
  const isSelf =
    !!profile.data?.isSelf ||
    (!!me && !!profile.data && (me.id === profile.data.id || me.username === profile.data.username));
  const [tab, setTab] = useState<Tab>('trips');

  const follow = useFollowMutation(handle ?? '');
  const publicTrips = useTrips(profile.data ? { userId: profile.data.id, sort: 'recent' } : {});
  const drafts = useMyTrips({ status: 'DRAFT' }, isSelf && tab === 'drafts');
  const travelMap = useTravelMap(tab === 'map' ? handle : undefined);

  if (profile.isLoading) return <ProfileSkeleton />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;
  if (!profile.data) return null;

  const p = profile.data;
  const trips = flatten(publicTrips.data);
  const draftTrips = flatten(drafts.data);

  const tabs = [
    { value: 'trips' as const, label: 'Trips', badge: p.stats.trips },
    ...(isSelf ? [{ value: 'drafts' as const, label: 'Drafts' }] : []),
    { value: 'map' as const, label: 'Travel map', badge: p.stats.countries },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="relative z-0 -mx-4 mb-4 aspect-[4/1] overflow-hidden bg-sunk sm:mx-0 sm:rounded-xl2">
        {p.coverImage ? (
          <img src={p.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundImage: brandCover(p.id) }} aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ground via-ground/50 to-transparent" aria-hidden />
      </div>

      {/* z-10 lifts the whole header above the cover, which owns a stacking
          context of its own — without it the avatar is clipped by the cover. */}
      <header className="relative z-10 mb-7 -mt-14 px-1 sm:-mt-16">
        <div className="flex items-end gap-5">
          <Avatar user={p} size="xl" link={false} ring />

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{p.name}</h1>
              {isSelf && (
                <Link
                  to="/settings"
                  aria-label="Edit profile"
                  title="Edit profile"
                  className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-all duration-200 ease-spring hover:bg-sunk hover:text-brand active:scale-90"
                >
                  <Icon name="edit" size={17} />
                </Link>
              )}
            </div>
            <p className="text-sm text-ink-faint">@{p.username}</p>

            {(p.homeCity || p.homeCountry) && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
                <Icon name="pin" size={13} />
                {[p.homeCity, p.homeCountry].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          {!isSelf && (
            <div className="shrink-0 pb-1">
              <Button
                variant={p.isFollowing ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => {
                  if (!signedIn) return toast('Sign in to follow travellers');
                  follow.mutate(!!p.isFollowing);
                }}
              >
                {p.isFollowing ? 'Following' : p.isFollowedBy ? 'Follow back' : 'Follow'}
              </Button>
            </div>
          )}
        </div>

        {p.bio && <p className="mt-3.5 max-w-prose text-[15px] leading-relaxed">{p.bio}</p>}

        {p.websiteUrl && (
          <a
            href={p.websiteUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
          >
            <Icon name="globe" size={13} />
            {p.websiteUrl.replace(/^https?:\/\//, '')}
          </a>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <Stat label="Trips" value={p.stats.trips} />
          <Stat label="Places" value={p.stats.placesVisited} />
          <Stat label="Countries" value={p.stats.countries} />
          <Stat label="Followers" value={p.stats.followers} to={`/@${p.username}/followers`} />
          <Stat label="Following" value={p.stats.following} to={`/@${p.username}/following`} />
        </dl>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'trips' && (
        publicTrips.isError ? (
          <ErrorState error={publicTrips.error} onRetry={() => publicTrips.refetch()} />
        ) : trips.length === 0 && !publicTrips.isLoading ? (
          <EmptyState
            icon="saved"
            title={isSelf ? 'No published trips yet' : 'Nothing published yet'}
            body={isSelf ? 'Document your first trip and it will show up here.' : undefined}
            action={isSelf ? <Button to="/create">Create a trip</Button> : undefined}
          />
        ) : (
          <>
            <TripGrid trips={trips} loading={publicTrips.isLoading} skeletons={4} />
            <LoadMore
              onVisible={() => publicTrips.fetchNextPage()}
              hasMore={!!publicTrips.hasNextPage}
              loading={publicTrips.isFetchingNextPage}
            />
          </>
        )
      )}

      {tab === 'drafts' && (
        draftTrips.length === 0 && !drafts.isLoading ? (
          <EmptyState icon="edit" title="No drafts" body="Trips you start but do not publish live here." />
        ) : (
          <TripGrid trips={draftTrips} loading={drafts.isLoading} skeletons={2} />
        )
      )}

      {tab === 'map' && (
        travelMap.isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !travelMap.data?.length ? (
          <EmptyState icon="map" title="No places on the map yet" />
        ) : (
          <ul className="space-y-1.5">
            {travelMap.data.map((entry) => (
              <li
                key={`${entry.countryCode}-${entry.state ?? ''}`}
                className="flex items-center gap-3.5 rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-inset ring-line-soft transition-shadow duration-300 hover:shadow-card"
              >
                <span className="tnum grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-2xs font-bold text-brand ring-1 ring-inset ring-brand/20">
                  {entry.countryCode}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {entry.state ? `${entry.state}, ${entry.country}` : entry.country}
                  </span>
                  <span className="tnum block text-xs text-ink-faint">
                    {entry.tripCount} {entry.tripCount === 1 ? 'trip' : 'trips'} · {entry.placeCount} places
                  </span>
                </span>
                {entry.lastVisitedAt && (
                  <span className="shrink-0 text-2xs text-ink-faint">{formatDate(entry.lastVisitedAt)}</span>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to?: string }) {
  const content = (
    <>
      <dd className="tnum text-base font-semibold">{compactCount(value)}</dd>
      <dt className="text-xs text-ink-faint">{label}</dt>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="flex items-baseline gap-1.5 hover:text-brand">
        {content}
      </Link>
    );
  }
  return <div className="flex items-baseline gap-1.5">{content}</div>;
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-card" />)}
      </div>
    </div>
  );
}

export function FollowListPage({ kind }: { kind: 'followers' | 'following' }) {
  const { username } = useParams<{ username: string }>();
  const handle = username?.replace(/^@/, '');
  const list = useFollowList(handle, kind);
  const users = flatten(list.data);

  return (
    <div className="mx-auto w-full max-w-lg">
      <header className="mb-5">
        <Link to={`/@${handle}`} className="text-[13px] font-medium text-brand hover:underline">
          ← @{handle}
        </Link>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight capitalize">{kind}</h1>
      </header>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : users.length === 0 && !list.isLoading ? (
        <EmptyState icon="user" title={`No ${kind} yet`} />
      ) : (
        <ul className="space-y-1">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                to={`/@${user.username}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-sunk"
              >
                <Avatar user={user} size="md" link={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{user.name}</span>
                  <span className="block truncate text-xs text-ink-faint">@{user.username}</span>
                </span>
                {user.isFollowing && <Badge tone="neutral">Following</Badge>}
              </Link>
            </li>
          ))}
          <LoadMore
            onVisible={() => list.fetchNextPage()}
            hasMore={!!list.hasNextPage}
            loading={list.isFetchingNextPage}
          />
        </ul>
      )}
    </div>
  );
}
