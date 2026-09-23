import { useEffect, useRef } from 'react';
import { ApiError, NetworkError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Bits';

/** Turns any thrown error into something a person can act on. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof NetworkError) {
    return (
      <EmptyState
        icon="globe"
        title="Cannot reach TripSphere"
        body="The API is not responding. If it is hosted on a free tier it may be waking up — give it a moment and try again."
        action={onRetry && <Button onClick={onRetry} variant="outline">Try again</Button>}
      />
    );
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return (
        <EmptyState
          icon="compass"
          title="Not here"
          body="This either does not exist, or the traveller keeps it private."
          action={<Button to="/explore" variant="outline">Explore trips</Button>}
        />
      );
    }
    if (error.status === 401 || error.status === 403) {
      return (
        <EmptyState
          icon="lock"
          title="Sign in to see this"
          action={<Button to="/login">Log in</Button>}
        />
      );
    }
    return (
      <EmptyState
        icon="warning"
        title="Something went wrong"
        body={error.message}
        action={onRetry && <Button onClick={onRetry} variant="outline">Try again</Button>}
      />
    );
  }

  return (
    <EmptyState
      icon="warning"
      title="Something went wrong"
      action={onRetry && <Button onClick={onRetry} variant="outline">Try again</Button>}
    />
  );
}

/** Fires `onVisible` when scrolled into view — drives every infinite list. */
export function LoadMore({
  onVisible, hasMore, loading,
}: {
  onVisible: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && onVisible(),
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onVisible]);

  if (!hasMore) return null;
  return <div ref={ref} className="h-10" aria-hidden />;
}

export function PageTitle({
  eyebrow, title, subtitle, action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
