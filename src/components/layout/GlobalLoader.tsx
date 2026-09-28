import { useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { TravelLoader } from '@/components/ui/TravelLoader';
import { useBusyCount } from '@/lib/busy';

/** Below this, a request finished fast enough that showing a bar would only flicker. */
const SHOW_AFTER = 400;
/** Past this, the request is slow enough to deserve an explanation. */
const EXPLAIN_AFTER = 2500;

/**
 * What the card says as the wait grows. The API sleeps on a free tier and a
 * cold start takes up to a minute, so past a few seconds the honest answer is
 * that the server is waking up — said calmly, so a long wait reads as expected.
 */
const STAGES = [
  { from: 0, title: 'Still working on it', body: 'Plotting the route to your data…' },
  { from: 8, title: 'Waking up the server', body: 'It naps when nobody is around. The first request back can take up to a minute.' },
  { from: 25, title: 'Almost there', body: 'Thanks for waiting. Everything is quick once it is awake.' },
];

/**
 * One indicator for every in-flight request. A thin bar appears across the top
 * once a call is slow enough to notice; if it drags on — this API cold-starts —
 * a small card explains that rather than leaving the screen apparently frozen.
 */
export function GlobalLoader() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const manual = useBusyCount();
  const active = fetching + mutating + manual > 0;

  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setSlow(false);
      return;
    }
    startedAt.current = Date.now();
    setElapsed(0);
    const show = setTimeout(() => setVisible(true), SHOW_AFTER);
    const explain = setTimeout(() => setSlow(true), EXPLAIN_AFTER);
    return () => {
      clearTimeout(show);
      clearTimeout(explain);
    };
  }, [active]);

  // The seconds counter only ticks while the card is up.
  useEffect(() => {
    if (!slow) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [slow]);

  const stage = [...STAGES].reverse().find((candidate) => elapsed >= candidate.from) ?? STAGES[0];

  return (
    <>
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      >
        <div className="h-full w-1/4 animate-bar-slide rounded-r-full gradient-brand" />
      </div>

      <div
        className={cn(
          // Bottom centre: the header owns the top of the screen and the
          // toasts own the top right, so anything up there collides.
          'pointer-events-none fixed left-1/2 z-[100] -translate-x-1/2 transition-all duration-300 ease-spring',
          'bottom-24 lg:bottom-8',
          slow && visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
        role="status"
        aria-live="polite"
      >
        <div className="glass relative flex w-[min(calc(100vw-32px),380px)] items-center gap-3.5 overflow-hidden rounded-2xl py-3 pl-3 pr-4 shadow-lift ring-1 ring-inset ring-line-soft">
          <span className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-brand/20 blur-2xl" aria-hidden />
          <TravelLoader size={52} className="relative drop-shadow-[0_6px_14px_rgb(var(--c-brand)/0.35)]" />

          <div className="relative min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-[14px] font-semibold leading-tight">{stage.title}</p>
              <span className="tnum shrink-0 text-2xs text-ink-faint" aria-hidden>{elapsed}s</span>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{stage.body}</p>
          </div>

          {/* Indeterminate hairline along the bottom edge. */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-brand/10" aria-hidden>
            <div className="h-full w-1/3 animate-bar-slide rounded-full gradient-brand" />
          </div>
        </div>
      </div>
    </>
  );
}
