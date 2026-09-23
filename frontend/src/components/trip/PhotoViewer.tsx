import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import type { TripPhoto } from '@/api/types';

const SWIPE_THRESHOLD = 48;

/**
 * Full-screen photo viewer. Story conventions: segment bar across the top,
 * tap the left or right of the frame to move, and the ends wrap around.
 * Deliberately not auto-advancing — these are photos to look at, not a feed.
 */
export function PhotoViewer({
  photos, startIndex, onClose,
}: {
  photos: TripPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const count = photos.length;
  const go = useCallback((delta: 1 | -1) => {
    setDirection(delta);
    setIndex((current) => (current + delta + count) % count);
  }, [count]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  // Warm the neighbours so a tap does not land on a blank frame.
  useEffect(() => {
    [(index + 1) % count, (index - 1 + count) % count].forEach((i) => {
      const img = new Image();
      img.src = photos[i].media.url;
    });
  }, [index, count, photos]);

  const photo = photos[index];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${count}`}
    >
      {/* The backdrop is opaque and un-animated on purpose: fading the whole
          overlay leaves the page readable through it for the first frames. */}
      {count > 1 && (
        <div className="flex shrink-0 gap-1 px-3 pt-3" aria-hidden>
          {photos.map((item, i) => (
            <span key={item.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className={cn(
                  'block h-full rounded-full bg-white transition-all duration-300',
                  i < index ? 'w-full opacity-70' : i === index ? 'w-full' : 'w-0',
                )}
              />
            </span>
          ))}
        </div>
      )}

      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <span className="tnum text-[13px] font-medium text-white/70">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <Icon name="x" size={18} />
        </button>
      </header>

      <div
        className="relative min-h-0 flex-1"
        onTouchStart={(event) => {
          const t = event.touches[0];
          touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(event) => {
          if (!touch.current) return;
          const t = event.changedTouches[0];
          const dx = t.clientX - touch.current.x;
          const dy = t.clientY - touch.current.y;
          touch.current = null;
          if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
            go(dx < 0 ? 1 : -1);
          }
        }}
      >
        <img
          key={photo.id}
          src={photo.media.url}
          alt={photo.caption ?? ''}
          className={cn(
            'absolute inset-0 m-auto max-h-full max-w-full object-contain',
            direction === 1 ? 'animate-slide-in' : 'animate-fade-in',
          )}
        />

        {count > 1 && (
          <>
            {/* Story-style tap zones, with visible arrows on pointer devices. */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="group absolute inset-y-0 left-0 w-1/3 cursor-w-resize focus:outline-none"
            >
              <span className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                <Icon name="chevronLeft" size={20} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="group absolute inset-y-0 right-0 w-2/3 cursor-e-resize focus:outline-none"
            >
              <span className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                <Icon name="chevronRight" size={20} />
              </span>
            </button>
          </>
        )}
      </div>

      {(photo.caption || photo.place || photo.takenAt) && (
        <footer className="shrink-0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 text-center">
          {photo.caption && <p className="text-sm text-white">{photo.caption}</p>}
          <p className="mt-1 flex items-center justify-center gap-3 text-xs text-white/60">
            {photo.place && (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={12} />
                {photo.place.name}
              </span>
            )}
            {photo.takenAt && <span className="tnum">{formatDate(photo.takenAt)}</span>}
          </p>
        </footer>
      )}
    </div>,
    document.body,
  );
}
