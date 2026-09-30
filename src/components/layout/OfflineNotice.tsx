import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useConnectivity } from '@/store/connectivity';

/** "4 min ago" from a timestamp, without pulling in a date library. */
function since(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return 'moments ago';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/**
 * A single quiet line explaining why the screen may be behind, shown only when
 * the data genuinely cannot be refreshed.
 *
 * The two causes read differently on purpose. A traveller with no signal knows
 * what to do about it; a server waking from sleep is ours to own, and saying
 * "reconnecting" there is both true and less alarming than an error.
 */
export function OfflineNotice() {
  const { reach, lastContactAt } = useConnectivity();
  const stale = reach === 'offline' || reach === 'unreachable';

  // Re-render on a slow tick so the age stays honest without a timer per second.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!stale) return;
    const timer = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, [stale]);

  if (!stale) return null;

  const offline = reach === 'offline';

  return (
    <div
      role="status"
      className="sticky top-[76px] z-30 -mx-5 mb-4 border-y border-warn/25 bg-warn-soft/80 px-5 py-2 backdrop-blur-md sm:-mx-8 sm:px-8"
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 text-[13px]">
        <Icon
          name={offline ? 'cloudOff' : 'retry'}
          size={14}
          className={offline ? 'shrink-0 text-warn' : 'shrink-0 animate-spin text-warn [animation-duration:2.5s]'}
        />
        <span className="min-w-0 font-medium">
          {offline ? "You're offline" : 'Reconnecting'}
        </span>
        <span className="min-w-0 truncate text-ink-soft">
          · Showing your saved copy
          {lastContactAt ? ` from ${since(lastContactAt)}` : ''}
        </span>
      </div>
    </div>
  );
}
