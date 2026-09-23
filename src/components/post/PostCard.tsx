import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { compactCount, duration, moneyShort, timeAgo, travelers } from '@/lib/format';
import { Avatar, Badge } from '@/components/ui/Bits';
import { Icon } from '@/components/ui/Icon';
import { FloatButton } from '@/components/ui/Button';
import { useLikeMutation } from '@/api/queries';
import { postsApi } from '@/api/endpoints';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import type { Post } from '@/api/types';

export function PostCard({ post }: { post: Post }) {
  const { signedIn } = useAuth();
  const like = useLikeMutation();
  const toast = useToast();
  const [saved, setSaved] = useState(!!post.isSaved);
  const [index, setIndex] = useState(0);

  const media = post.media.length ? post.media : post.trip?.coverMedia ? [post.trip.coverMedia] : [];

  const onLike = () => {
    if (!signedIn) return toast('Sign in to like this trip');
    like.mutate({ postId: post.id, liked: !!post.isLiked });
  };

  const onSave = async () => {
    if (!signedIn) return toast('Sign in to save this trip');
    const next = !saved;
    setSaved(next);
    try {
      await (next ? postsApi.save(post.id) : postsApi.unsave(post.id));
    } catch {
      setSaved(!next);
      toast('Could not save that', 'error');
    }
  };

  const onShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: post.trip?.title ?? 'TripSphere' });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
      }
      postsApi.share(post.id).catch(() => undefined);
    } catch { /* the user dismissed the share sheet */ }
  };

  return (
    <article className="group overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line-soft transition-shadow duration-300 hover:shadow-card">
      <header className="flex items-center gap-3 p-4">
        <Avatar user={post.user} size="sm" ring />
        <div className="min-w-0 flex-1">
          <Link to={`/@${post.user.username}`} className="block truncate text-sm font-semibold hover:text-brand">
            {post.user.name}
          </Link>
          {post.trip && (
            <p className="flex items-center gap-1 truncate text-xs text-ink-faint">
              <Icon name="pin" size={11} />
              {post.trip.state ? `${post.trip.state} · ` : ''}{post.trip.destination}
            </p>
          )}
        </div>
        <time className="shrink-0 text-2xs text-ink-faint" dateTime={post.createdAt}>
          {timeAgo(post.createdAt)}
        </time>
      </header>

      {media.length > 0 && (
        <div className="relative aspect-[4/5] bg-sunk">
          <img src={media[index].url} alt="" className="h-full w-full object-cover" loading="lazy" />
          {post.place && (
            <span className="absolute left-3 top-3">
              <Badge tone="glass"><Icon name="pin" size={11} />{post.place.name}</Badge>
            </span>
          )}

          {media.length > 1 && (
            <>
              {index > 0 && (
                <CarouselButton side="left" onClick={() => setIndex((i) => i - 1)} />
              )}
              {index < media.length - 1 && (
                <CarouselButton side="right" onClick={() => setIndex((i) => i + 1)} />
              )}
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {media.map((item, i) => (
                  <span
                    key={item.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300 ease-spring',
                      i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50',
                    )}
                  />
                ))}
              </div>
              <span className="absolute right-3 top-3 rounded-pill glass px-2 py-0.5 font-mono text-2xs text-white ring-1 ring-inset ring-white/20">
                {index + 1}/{media.length}
              </span>
            </>
          )}
        </div>
      )}

      <div className="p-4">
        {post.caption && (
          <p className="mb-3 whitespace-pre-line text-sm leading-relaxed">{post.caption}</p>
        )}

        {/* The stats strip comes straight off the embedded trip — no extra fetch. */}
        {post.trip && <TripStatsStrip trip={post.trip} />}

        <div className="mt-3.5 flex items-center gap-1 border-t border-line-soft pt-3">
          <Action
            icon="heart"
            label={compactCount(post.likeCount)}
            active={!!post.isLiked}
            activeClass="text-danger"
            onClick={onLike}
            aria={post.isLiked ? 'Unlike' : 'Like'}
          />
          <Action
            icon="comment"
            label={compactCount(post.commentCount)}
            to={`/posts/${post.id}`}
            aria="Comments"
          />
          <Action icon="share" label={compactCount(post.shareCount)} onClick={onShare} aria="Share" />
          <Action
            icon="bookmark"
            label=""
            active={saved}
            activeClass="text-brand"
            onClick={onSave}
            aria={saved ? 'Unsave' : 'Save'}
            className="ml-auto"
          />
        </div>
      </div>
    </article>
  );
}

function TripStatsStrip({ trip }: { trip: NonNullable<Post['trip']> }) {
  const total = moneyShort(trip.totalExpense, trip.currency);
  const perPerson = moneyShort(trip.perPerson, trip.currency);

  return (
    <Link
      to={`/trips/${trip.slug}`}
      className="group/strip block rounded-2xl bg-sunk/70 p-3.5 ring-1 ring-inset ring-line-soft transition-all duration-200 ease-spring hover:ring-brand/40"
    >
      <p className="mb-2 line-clamp-1 font-display text-[15px] font-semibold">{trip.title}</p>
      <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-soft">
        <dd className="tnum text-sm font-bold text-ember">
          {total ?? 'Spending hidden'}
          {perPerson && <span className="ml-1.5 text-xs font-normal text-ink-soft">{perPerson}/person</span>}
        </dd>
        <dd className="tnum">{travelers(trip.travelerCount)}</dd>
        <dd className="tnum">{duration(trip.nights, trip.days)}</dd>
        <dd className="tnum">{trip.placeCount} places</dd>
        {trip.photoCount > 0 && <dd className="tnum">{trip.photoCount} photos</dd>}
      </dl>
      <p className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
        View full experience
        <Icon name="arrowRight" size={13} className="transition-transform duration-200 ease-spring group-hover/strip:translate-x-1" />
      </p>
    </Link>
  );
}

function Action({
  icon, label, active, activeClass, onClick, to, aria, className,
}: {
  icon: 'heart' | 'comment' | 'share' | 'bookmark';
  label: string;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  to?: string;
  aria: string;
  className?: string;
}) {
  const content = (
    <>
      <Icon name={icon} size={19} filled={active} strokeWidth={1.8} />
      {label && <span className="tnum text-[13px] font-medium">{label}</span>}
    </>
  );

  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-all duration-200 ease-spring active:scale-90',
    active ? activeClass : 'text-ink-soft hover:bg-sunk hover:text-ink',
    className,
  );

  if (to) return <Link to={to} aria-label={aria} className={classes}>{content}</Link>;
  return (
    <button onClick={onClick} aria-label={aria} aria-pressed={active} className={classes}>
      {content}
    </button>
  );
}

function CarouselButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <FloatButton
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn('absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        side === 'left' ? 'left-3' : 'right-3')}
    >
      <Icon name={side === 'left' ? 'chevronLeft' : 'chevronRight'} size={18} strokeWidth={2.3} />
    </FloatButton>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-line-soft">
      <div className="flex items-center gap-3 p-4">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-2.5 w-20" />
        </div>
      </div>
      <div className="skeleton aspect-[4/5] rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
