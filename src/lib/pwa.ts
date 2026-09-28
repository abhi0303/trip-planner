import { useSyncExternalStore } from 'react';

/** Chromium's install event. Not in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * `beforeinstallprompt` fires once, early, and often before the page that wants
 * it has mounted. So it is caught here at import time and held until asked for.
 */
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export function registerServiceWorker() {
  // Dev skips it: a worker there would only get in the way of hot reload.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

/** Already running as the installed app. */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS never fires the install event; it has to be done from the Share sheet. */
export function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInstallPrompt() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null);
  const justInstalled = useSyncExternalStore(subscribe, () => installed);

  /** Opens the browser's install dialog. Resolves true if the user accepted. */
  const install = async () => {
    if (!deferred) return false;
    const event = deferred;
    // The event is single use either way.
    deferred = null;
    notify();
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  };

  return { canPrompt, installed: justInstalled, install };
}
