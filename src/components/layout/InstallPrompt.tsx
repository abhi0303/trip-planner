import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { isIos, isStandalone, useInstallPrompt } from '@/lib/pwa';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const DISMISSED_KEY = 'ts.installDismissed';
/** A "not now" holds for two weeks, then the card may come back once. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function wasDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return !!at && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Floating "install the app" card. Chromium browsers get a button that opens
 * the real install dialog; iOS Safari, which has no such dialog, gets the
 * Share → Add to Home Screen steps. Browsers that can do neither see nothing.
 */
export function InstallPrompt() {
  const { canPrompt, installed, install } = useInstallPrompt();
  const [ios] = useState(isIos);
  const [dismissed, setDismissed] = useState(() => isStandalone() || wasDismissed());
  // A beat after load, so it arrives after the feed rather than with it.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private mode: it just comes back next visit.
    }
  };

  if (!ready || dismissed || installed || !(canPrompt || ios)) return null;

  return createPortal(
    /* Bottom right on desktop; on a phone it sits above the floating dock. */
    <div
      role="dialog"
      aria-label="Install TripSphere"
      className={cn(
        'fixed inset-x-4 bottom-[calc(max(14px,env(safe-area-inset-bottom))+76px)] z-[80] animate-fade-up',
        'sm:inset-x-auto sm:right-5 sm:w-[360px] lg:bottom-6',
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-surface p-4 shadow-lift ring-1 ring-inset ring-line-soft">
        <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/20 blur-3xl" aria-hidden />

        <div className="relative flex items-start gap-3">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl shadow-[0_4px_14px_-6px_rgb(var(--c-brand)/0.9)]"
          />

          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold leading-tight">Get the TripSphere app</p>
            {ios ? (
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                Tap <Icon name="iosShare" size={14} className="inline -mt-0.5 text-brand" /> Share, then{' '}
                <span className="font-medium text-ink">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                Install it on your device. It opens full screen, with no app store needed.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        {!ios && (
          <div className="relative mt-3.5 flex gap-2">
            <Button
              size="sm"
              full
              onClick={async () => {
                if (await install()) setDismissed(true);
              }}
            >
              <Icon name="download" size={15} /> Install app
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
