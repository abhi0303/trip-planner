import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface Props {
  file: File;
  /** Width ÷ height of the crop frame. 1 for an avatar, 4 for a cover. */
  aspect: number;
  /** Longest edge of the exported image. */
  outputWidth: number;
  round?: boolean;
  title?: string;
  /** Shows a third action that accepts the file without cropping. */
  skipLabel?: string;
  onSkip?: () => void;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const MAX_ZOOM = 4;

/**
 * Pan-and-zoom cropper. The image is always at least as large as the frame, so
 * there is no way to produce a crop with empty edges, and the export is taken
 * from the natural-resolution source rather than the on-screen preview.
 */
export function ImageCropper({
  file, aspect, outputWidth, round, title = 'Adjust image',
  skipLabel, onSkip, onCancel, onConfirm,
}: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const needsCentre = useRef(true);
  const lastScale = useRef(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setFrameSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  /** Scale at which the image exactly covers the frame — the zoom floor. */
  const baseScale = natural && frameSize.w
    ? Math.max(frameSize.w / natural.w, frameSize.h / natural.h)
    : 1;
  const scale = baseScale * zoom;
  const displayed = natural ? { w: natural.w * scale, h: natural.h * scale } : { w: 0, h: 0 };

  const clamp = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(frameSize.w - displayed.w, next.x)),
      y: Math.min(0, Math.max(frameSize.h - displayed.h, next.y)),
    }),
    [frameSize.w, frameSize.h, displayed.w, displayed.h],
  );

  useEffect(() => {
    if (!natural || !frameSize.w || !displayed.w) return;

    // First paint for a given image: start centred rather than at its top-left
    // corner, which is what a crop tool is expected to do.
    if (needsCentre.current) {
      needsCentre.current = false;
      lastScale.current = scale;
      setOffset(clamp({ x: (frameSize.w - displayed.w) / 2, y: (frameSize.h - displayed.h) / 2 }));
      return;
    }

    // Zooming keeps whatever is under the middle of the frame in the middle,
    // instead of drifting the image toward a corner.
    if (lastScale.current && lastScale.current !== scale) {
      const k = scale / lastScale.current;
      const cx = frameSize.w / 2;
      const cy = frameSize.h / 2;
      lastScale.current = scale;
      setOffset((current) => clamp({ x: cx - (cx - current.x) * k, y: cy - (cy - current.y) * k }));
      return;
    }

    setOffset((current) => clamp(current));
  }, [natural, frameSize.w, frameSize.h, scale, displayed.w, displayed.h, clamp]);

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as Element).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({
      x: drag.current.ox + (event.clientX - drag.current.x),
      y: drag.current.oy + (event.clientY - drag.current.y),
    }));
  };

  const endDrag = () => { drag.current = null; };

  const confirm = async () => {
    const img = image.current;
    if (!img || !natural) return;
    setBusy(true);

    try {
      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');

      // Map the visible frame back onto the source image's own pixels.
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = frameSize.w / scale;
      const sh = frameSize.h / scale;

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) throw new Error('encode failed');

      const name = file.name.replace(/\.[^.]+$/, '') || 'image';
      onConfirm(new File([blob], `${name}.jpg`, { type: 'image/jpeg' }));
    } catch {
      // Canvas could not read the source — hand back the original untouched
      // rather than blocking the upload.
      onConfirm(file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-ink-faint sm:block">Drag to reposition · scroll or use the slider to zoom</p>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            {onSkip && (
              <Button variant="outline" onClick={onSkip}>{skipLabel ?? 'Skip'}</Button>
            )}
            <Button onClick={confirm} loading={busy} disabled={!natural}>Apply</Button>
          </div>
        </div>
      }
    >
      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(event) => {
          setZoom((z) => Math.min(MAX_ZOOM, Math.max(1, z - event.deltaY * 0.0016)));
        }}
        style={{ aspectRatio: String(aspect) }}
        className={cn(
          'relative w-full touch-none select-none overflow-hidden bg-sunk',
          'cursor-grab active:cursor-grabbing',
          round ? 'rounded-full' : 'rounded-2xl',
        )}
      >
        {src && (
          <img
            ref={image}
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const el = event.currentTarget;
              needsCentre.current = true;
              lastScale.current = 0;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
              setZoom(1);
            }}
            style={{
              width: displayed.w || undefined,
              height: displayed.h || undefined,
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            }}
            className="max-w-none origin-top-left"
          />
        )}

        {/* Rule-of-thirds guides, shown only while the frame is rectangular. */}
        {!round && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/25" aria-hidden />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Icon name="search" size={15} className="shrink-0 text-ink-faint" />
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="Zoom"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-sunk accent-[rgb(var(--c-brand))]"
        />
        <span className="tnum w-10 shrink-0 text-right text-xs text-ink-faint">{zoom.toFixed(1)}×</span>
      </div>
    </Modal>
  );
}
