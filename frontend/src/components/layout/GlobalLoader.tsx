import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { useBusyCount } from '@/lib/busy';

/** Below this, a request finished fast enough that showing a bar would only flicker. */
const SHOW_AFTER = 400;
/** Past this, the request is slow enough to deserve an explanation. */
const EXPLAIN_AFTER = 2500;

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

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setSlow(false);
      return;
    }
    const show = setTimeout(() => setVisible(true), SHOW_AFTER);
    const explain = setTimeout(() => setSlow(true), EXPLAIN_AFTER);
    return () => {
      clearTimeout(show);
      clearTimeout(explain);
    };
  }, [active]);

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
        <div className="flex items-center gap-2.5 rounded-pill bg-surface px-4 py-2 shadow-lift ring-1 ring-inset ring-line-soft">
          <Icon name="spinner" size={15} className="animate-spin text-brand" />
          <span className="text-[13px] font-medium">Still working — the server may be waking up</span>
        </div>
      </div>
    </>
  );
}
