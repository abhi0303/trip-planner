import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/** Automatic retries after a failed load, and how long to wait before each. */
const AUTO_RETRY_DELAYS = [1500, 4000];
/** Visible but still not loaded after this long: offer a manual retry. */
const STALL_MS = 12_000;

type Status = 'loading' | 'loaded' | 'error';

/** Same image, new URL: a cache-busting query so the browser really asks again. */
function withAttempt(src: string, attempt: number) {
  if (!attempt) return src;
  return `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`;
}

/**
 * Loading state for one remote image, with recovery. A failed load retries by
 * itself twice; after that, or if the image sits unloaded for 12s once it is
 * on screen, `stalled` turns on so the caller can offer a retry. Coming back
 * online retries anything that failed.
 */
export function useImageLoader(src: string | null | undefined) {
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const [stalled, setStalled] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const failures = useRef(0);

  // A new source starts over.
  useEffect(() => {
    setStatus('loading');
    setAttempt(0);
    setStalled(false);
    failures.current = 0;
  }, [src]);

  // Served from the cache, the image can finish before React attaches onLoad.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setStatus('loaded');
  }, [src, attempt]);

  // Only count the stall clock once the image is actually on screen: a lazy
  // image far down the page has not even started, and is not stuck.
  useEffect(() => {
    const img = ref.current;
    if (!img || typeof IntersectionObserver === 'undefined') return setVisible(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    if (!visible || status !== 'loading') return;
    const timer = window.setTimeout(() => setStalled(true), STALL_MS);
    return () => window.clearTimeout(timer);
  }, [visible, status, attempt]);

  const retry = useCallback(() => {
    failures.current = 0;
    setStalled(false);
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  // Back online: try again whatever gave up while the network was down.
  useEffect(() => {
    if (status !== 'error') return;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [status, retry]);

  const onLoad = useCallback(() => {
    setStatus('loaded');
    setStalled(false);
  }, []);

  const onError = useCallback(() => {
    const delay = AUTO_RETRY_DELAYS[failures.current];
    if (delay === undefined) {
      setStatus('error');
      return;
    }
    failures.current += 1;
    window.setTimeout(() => setAttempt((n) => n + 1), delay);
  }, []);

  return {
    ref,
    src: src ? withAttempt(src, attempt) : undefined,
    status,
    /** Worth showing a retry: gave up, or taking far too long. */
    showRetry: status === 'error' || (status === 'loading' && stalled),
    retry,
    onLoad,
    onError,
  };
}

/**
 * A remote photo that never sits blank: a shimmer while it loads, a fade in
 * when it lands, quiet retries when it fails, and a tap-to-retry if it still
 * will not come. Fills its parent like `h-full w-full object-cover` did; the
 * parent needs a size (and `relative` is added here).
 */
export function SmartImage({
  src, alt = '', className, imgClassName, fit = 'cover', compact, eager, placeholder = 'shimmer',
}: {
  src: string;
  alt?: string;
  /** Classes for the frame, e.g. an aspect ratio or rounding. */
  className?: string;
  /** Extra classes on the <img> itself, e.g. a hover zoom. */
  imgClassName?: string;
  fit?: 'cover' | 'contain';
  /** Icon-only retry, for thumbnails too small for a label. */
  compact?: boolean;
  /** Above the fold: skip lazy loading. */
  eager?: boolean;
  /** `none` over a dark backdrop, such as the photo viewer, where a light shimmer would flash. */
  placeholder?: 'shimmer' | 'none';
}) {
  const image = useImageLoader(src);
  const dark = placeholder === 'none';

  const retry = (event: React.SyntheticEvent) => {
    // Images often sit inside links or buttons: retrying must not open them.
    event.preventDefault();
    event.stopPropagation();
    image.retry();
  };

  return (
    <span className={cn('relative block h-full w-full overflow-hidden', className)}>
      {!dark && image.status !== 'loaded' && !image.showRetry && (
        <span className="skeleton absolute inset-0 rounded-none" aria-hidden />
      )}

      <img
        ref={image.ref}
        src={image.src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={image.onLoad}
        onError={image.onError}
        className={cn(
          'h-full w-full transition-opacity duration-500',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          image.status === 'loaded' ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />

      {image.showRetry && (
        <span className={cn('absolute inset-0 grid place-items-center', dark ? 'bg-transparent' : 'bg-sunk')}>
          {/* A span, not a <button>: this often renders inside a link or button,
              where a nested button is invalid and swallows the click. */}
          <span
            role="button"
            tabIndex={0}
            onClick={retry}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') retry(event);
            }}
            aria-label="Retry loading image"
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1 transition-transform duration-200 ease-spring active:scale-95',
              dark ? 'text-white/80' : 'text-ink-soft',
            )}
          >
            <span className="glass grid h-11 w-11 place-items-center rounded-full shadow-card ring-1 ring-inset ring-line-soft">
              <Icon name="retry" size={18} strokeWidth={2} className="text-brand" />
            </span>
            {!compact && (
              <span className="px-2 text-center text-xs font-medium">
                {image.status === 'error' ? 'Photo didn’t load · Tap to retry' : 'Taking a while · Tap to retry'}
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
