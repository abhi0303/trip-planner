import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { compactCount } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { CommentComposer, CommentList } from './Comments';

/** Matches the sheet-down animation, so the panel is unmounted only after it has left. */
const CLOSE_MS = 240;
/** Drag the handle further than this and letting go closes the sheet. */
const DISMISS_DRAG = 110;

/**
 * Comments in a bottom sheet over the feed: slides up to cover about two thirds
 * of the screen, so reading and replying never leaves the post you were on.
 * Closes on the backdrop, the close button, Escape, or a drag down on the handle.
 */
export function CommentsSheet({
  postId, commentCount, open, onClose,
}: {
  postId: string;
  commentCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setDrag(0);
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    // Keep the feed behind from scrolling while the sheet is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  if (!open) return null;

  const onPointerDown = (event: React.PointerEvent) => {
    dragStart.current = event.clientY;
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDrag(Math.max(0, event.clientY - dragStart.current));
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDragging(false);
    if (drag > DISMISS_DRAG) close();
    else setDrag(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div
        className={cn(
          'absolute inset-0 bg-ground-deep/60 backdrop-blur-sm',
          closing ? 'animate-fade-out' : 'animate-fade-in',
        )}
        onClick={close}
        aria-hidden
      />

      {/* The slide animation and the drag offset sit on separate elements:
          an animation's transform would override the inline one. */}
      <div
        className={cn(
          'relative h-[68dvh] max-h-[calc(100dvh-48px)] w-full max-w-[560px]',
          closing ? 'animate-sheet-down' : 'animate-sheet-up',
        )}
      >
        <div
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="comments-sheet-title"
          style={{
            transform: drag ? `translateY(${drag}px)` : undefined,
            transition: dragging ? 'none' : 'transform 200ms cubic-bezier(.16,1,.3,1)',
          }}
          className="relative flex h-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-lift outline-none ring-1 ring-inset ring-line-soft"
        >
          {/* Brand wash behind the header, the same bloom the hero cards use. */}
          <span className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-brand/15 blur-3xl" aria-hidden />
          <span className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-brand-2/15 blur-3xl" aria-hidden />

          {/* Handle and header: the drag area. */}
          <header
            className="relative shrink-0 cursor-grab touch-none select-none px-5 pb-3 pt-2.5 active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-line" aria-hidden />
            <div className="flex items-center justify-between gap-3">
              <h2 id="comments-sheet-title" className="font-display text-[17px] font-semibold">
                Comments
                <span className="tnum ml-2 rounded-pill bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                  {compactCount(commentCount)}
                </span>
              </h2>
              <button
                type="button"
                onClick={close}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Close comments"
                className="grid h-9 w-9 place-items-center rounded-full bg-sunk text-ink-soft transition-all duration-200 ease-spring hover:text-ink active:scale-90"
              >
                <Icon name="x" size={17} />
              </button>
            </div>
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line-soft px-5 py-4">
            <CommentList postId={postId} />
          </div>

          <footer className="relative shrink-0 border-t border-line-soft bg-surface px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            <CommentComposer postId={postId} />
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
