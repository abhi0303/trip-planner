import { useState } from 'react';
import { Link } from 'react-router-dom';
import { flatten, useFeed, usePopularPlaces } from '@/api/queries';
import { PostCard, PostCardSkeleton } from '@/components/post/PostCard';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { Button } from '@/components/ui/Button';
import { EmptyState, Segmented } from '@/components/ui/Bits';
import nothingHereYet from '@/assets/nothing-here-yet.png';
import { placeIcon } from '@/lib/labels';
import { Icon, IconTile } from '@/components/ui/Icon';
import { useAuth } from '@/store/auth';
import type { FeedType } from '@/api/types';

/**
 * The feed carries posts, not trips — a trip only reaches it once its owner
 * shares one. Say so, because an empty Following tab otherwise reads as broken.
 */
const EMPTY_FEED_BODY: Record<FeedType, string | undefined> = {
  // for-you keeps a single line under the art, by design.
  'for-you': undefined,
  following: 'This tab carries posts shared by people you follow. Nobody you follow has posted one yet.',
  friends: 'This tab carries posts from people you follow who follow you back. None of them have posted yet.',
};

export function HomePage() {
  const { signedIn } = useAuth();
  const [type, setType] = useState<FeedType>('for-you');

  // following/friends return 403 without a token. Signed out there is only one
  // feed, so the switcher is not rendered at all rather than shown with a
  // single option — and `type` is pinned in case it went stale across a logout.
  const options = [
    { value: 'for-you', label: 'For you' },
    { value: 'following', label: 'Following' },
    { value: 'friends', label: 'Friends' },
  ] as const;

  const activeType: FeedType = signedIn ? type : 'for-you';
  const feed = useFeed(activeType);
  const posts = flatten(feed.data);

  return (
    <div className="mx-auto w-full max-w-[640px] lg:grid lg:max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div className="min-w-0">
        {signedIn && (
          <div className="mb-5">
            <Segmented options={options} value={activeType} onChange={setType} />
          </div>
        )}

        {feed.isError ? (
          <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
        ) : feed.isLoading ? (
          <div className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title={activeType === 'for-you' ? 'Nothing here yet' : 'Nothing posted yet'}
            body={EMPTY_FEED_BODY[activeType]}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button to={activeType === 'for-you' ? '/create' : '/explore'} size="lg" shine>
                  <Icon name={activeType === 'for-you' ? 'plus' : 'search'} size={18} />
                  {activeType === 'for-you' ? 'Create a trip' : 'Find travellers'}
                </Button>
                {signedIn && (
                  <Button to="/posts/new" variant="outline" size="lg">
                    <Icon name="send" size={17} /> Share a post
                  </Button>
                )}
              </div>
            }
            illustration={nothingHereYet}
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
            <LoadMore
              onVisible={() => feed.fetchNextPage()}
              hasMore={!!feed.hasNextPage}
              loading={feed.isFetchingNextPage}
            />
            {feed.isFetchingNextPage && <PostCardSkeleton />}
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-5">
          {!signedIn && <SignInPrompt />}
          <PopularPlaces />
        </div>
      </aside>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="hero-surface p-5 ring-1 ring-inset ring-line-soft">
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/25 blur-3xl" aria-hidden />
      <div className="relative">
        <IconTile name="sparkle" size="md" className="mb-3" />
        <h2 className="font-display text-base font-semibold">Keep your own record</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Log every trip with its real cost, places and ratings — then find trips
          like yours from travellers who actually went.
        </p>
        <div className="mt-4 flex gap-2">
          <Button to="/register" size="sm" full>Sign up</Button>
          <Button to="/login" size="sm" variant="outline" full>Log in</Button>
        </div>
      </div>
    </div>
  );
}

function PopularPlaces() {
  const places = usePopularPlaces(8);
  if (!places.data?.length) return null;

  return (
    <div className="rounded-card bg-surface p-5 ring-1 ring-inset ring-line-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Most documented</h2>
        <Link to="/explore" className="text-2xs font-medium text-brand transition-colors hover:text-brand-ink">
          See all
        </Link>
      </div>
      <ul className="-mx-2 space-y-0.5">
        {places.data.map((place) => (
          <li key={place.id}>
            <Link
              to={`/places/${place.slug}`}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sunk"
            >
              <IconTile name={placeIcon(place.category)} size="sm" tone="neutral" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium transition-colors group-hover:text-brand">
                  {place.name}
                </span>
                <span className="block truncate text-2xs text-ink-faint">
                  {[place.state, place.country].filter(Boolean).join(', ')}
                </span>
              </span>
              <span className="tnum shrink-0 rounded-pill bg-sunk px-2 py-0.5 text-2xs text-ink-faint">
                {place.experienceCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
