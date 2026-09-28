import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { isStandalone } from '@/lib/pwa';
import { Icon } from '@/components/ui/Icon';
import { TravelLoader } from '@/components/ui/TravelLoader';

/** Finger travel is halved, so the chip lags the finger like a spring. */
const RESISTANCE = 0.5;
/** Pull (after resistance) past this and letting go refreshes. */
const TRIGGER = 72;
/** The chip stops following the finger here. */
const MAX_PULL = 120;
/** Refreshes that come back instantly still show the loader this long, so the gesture reads as having done something. */
const MIN_SPIN_MS = 700;

/** True when the touch began inside something that scrolls on its own and is not at its top. */
function insideScrolledArea(target: EventTarget | null) {
  for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) return true;
  }
  return false;
}

/**
 * Pull down from the top of any page to refresh its data. Only in the
 * installed app: a browser tab already has its own pull-to-refresh, and two
 * at once would fight. Refreshing refetches every query on screen rather than
 * reloading, so the page updates in place.
 */
export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [enabled] = useState(() => typeof window !== 'undefined' && isStandalone());
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Gesture state lives in refs: touchmove fires far too often for React state.
  const start = useRef<{ x: number; y: number } | null>(null);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      start.current = null;
      tracking.current = false;
      pullRef.current = 0;
      setPull(0);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
      // Not while a sheet or modal holds the page, and only from the very top.
      if (document.body.style.overflow === 'hidden' || window.scrollY > 0) return;
      if (insideScrolledArea(event.target)) return;
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      tracking.current = false;
    };

    const onMove = (event: TouchEvent) => {
      if (!start.current) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;

      if (!tracking.current) {
        // A sideways swipe (a photo carousel, a chip rail) or an upward scroll is not a pull.
        if (Math.abs(dx) > Math.abs(dy) || dy <= 0) {
          if (Math.abs(dx) > 8 || dy < -8) start.current = null;
          return;
        }
        if (dy < 6) return;
        tracking.current = true;
      }

      if (window.scrollY > 0) return reset();
      // Stops the rubber-band bounce so the chip, not the page, moves.
      event.preventDefault();
      const next = Math.min(MAX_PULL, Math.max(0, dy * RESISTANCE));
      pullRef.current = next;
      setPull(next);
    };

    const onEnd = async () => {
      if (!start.current) return;
      const pulled = pullRef.current;
      reset();
      if (pulled < TRIGGER) return;

      refreshingRef.current = true;
      setRefreshing(true);
      navigator.vibrate?.(8);
      try {
        await Promise.all([
          queryClient.refetchQueries({ type: 'active' }),
          new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS)),
        ]);
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [enabled, queryClient]);

  if (!enabled) return null;

  // Once refreshing, the finger is gone and pull is 0: hold the chip at full size.
  const progress = refreshing ? 1 : Math.min(1, pull / TRIGGER);
  const armed = pull >= TRIGGER;
  const shown = refreshing || pull > 0;
  // Parked just under the header while refreshing; otherwise follows the pull.
  const offset = refreshing ? TRIGGER * 0.75 : pull * 0.75;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-50 flex justify-center"
      aria-live="polite"
    >
      <div
        role="status"
        aria-label={refreshing ? 'Refreshing' : undefined}
        style={{
          transform: `translateY(${offset}px) scale(${shown ? 0.6 + progress * 0.4 : 0.6})`,
          opacity: shown ? Math.max(0.35, progress) : 0,
          transition: pull > 0 && !refreshing ? 'none' : 'transform 320ms cubic-bezier(.16,1,.3,1), opacity 200ms ease',
        }}
        className={cn(
          'glass grid h-12 w-12 place-items-center rounded-full shadow-lift ring-1 ring-inset',
          armed || refreshing ? 'ring-brand/40' : 'ring-line-soft',
        )}
      >
        {refreshing ? (
          <TravelLoader size={40} />
        ) : (
          <span
            style={{ transform: `rotate(${progress * 270}deg)` }}
            className={cn('transition-colors duration-200', armed ? 'text-brand' : 'text-ink-faint')}
          >
            <Icon name="compass" size={22} strokeWidth={armed ? 2.2 : 1.8} />
          </span>
        )}
      </div>
    </div>
  );
}
