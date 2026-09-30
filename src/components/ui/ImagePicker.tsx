import { useRef, useState } from 'react';
import { mediaApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Button';
import { useToast } from './Toast';
import { ImageCropper } from './ImageCropper';
import { ConfirmDialog } from './ConfirmDialog';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif';

/**
 * Uploads a single image and hands back its URL. The API takes bytes and
 * attachment separately — `POST /media/upload` first, then whatever endpoint
 * stores the resulting URL — so this component only owns the upload half.
 */
export function useImageUpload() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const upload = async (file: File): Promise<string | null> => {
    setBusy(true);
    try {
      const [media] = await mediaApi.upload([file]);
      if (!media?.url) throw new Error('no url');
      return media.url;
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not upload that image', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { upload, busy };
}

/**
 * Holds the picked file until the crop is applied, so nothing is uploaded
 * until the framing is confirmed.
 */
function useCropFlow(onUploaded: (url: string) => void) {
  const [pending, setPending] = useState<File | null>(null);
  const { upload, busy } = useImageUpload();

  const pick = (file: File | undefined) => {
    if (file) setPending(file);
  };

  const apply = async (cropped: File) => {
    setPending(null);
    const url = await upload(cropped);
    if (url) onUploaded(url);
  };

  return { pending, pick, apply, cancel: () => setPending(null), busy };
}

/**
 * A control that sits on top of the image it acts on.
 *
 * Always visible, never hover-gated: a phone has no hover, and the previous
 * design revealed the only affordance on a pointer that half the people using
 * this will never have. Glass over a scrim so it stays legible on a photo of
 * a bright beach or a night market alike.
 */
function ImageAction({
  icon, label, onClick, disabled, size = 36, tone = 'plain',
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: number;
  tone?: 'plain' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        'grid place-items-center rounded-full text-white backdrop-blur-md',
        'bg-black/45 ring-1 ring-inset ring-white/25 shadow-[0_2px_8px_-2px_rgb(0_0_0/0.5)]',
        'transition-all duration-200 active:scale-90',
        'outline-none focus-visible:ring-2 focus-visible:ring-white',
        tone === 'danger' ? 'hover:bg-danger/90' : 'hover:bg-black/70',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <Icon name={icon} size={size >= 36 ? 17 : 15} />
    </button>
  );
}

/** Circular avatar picker, with its controls on the avatar itself. */
export function AvatarPicker({
  value, fallback, onChange, size = 96,
}: {
  value: string | null;
  fallback: string;
  onChange: (url: string | null) => void;
  size?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const crop = useCropFlow((url) => onChange(url));
  const [confirming, setConfirming] = useState(false);
  const busy = crop.busy;
  const choose = () => input.current?.click();

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          aria-label={value ? 'Replace profile picture' : 'Upload a profile picture'}
          className="block h-full w-full rounded-full outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-brand"
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-full gradient-brand text-xl font-semibold text-white">
              {fallback}
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white">
              <Spinner className="h-5 w-5" />
            </span>
          )}
        </button>

        {/* Siblings of the button, not children — a button inside a button is
            invalid and the inner one stops working. */}
        <span className="absolute -bottom-1 -right-1">
          <ImageAction icon="camera" label={value ? 'Replace picture' : 'Upload a picture'} onClick={choose} disabled={busy} size={32} />
        </span>
        {value && !busy && (
          <span className="absolute -right-1 -top-1">
            <ImageAction icon="trash" label="Remove picture" tone="danger" onClick={() => setConfirming(true)} size={32} />
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-medium">Profile picture</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
          JPEG, PNG, WebP or HEIC · up to 10 MB
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          crop.pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {crop.pending && (
        <ImageCropper
          file={crop.pending}
          aspect={1}
          round
          outputWidth={512}
          title="Adjust profile picture"
          onCancel={crop.cancel}
          onConfirm={crop.apply}
        />
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { onChange(null); setConfirming(false); }}
        title="Remove your profile picture?"
        body="Your initials will show instead. You can upload a new one whenever you like."
        confirmLabel="Remove"
      />
    </div>
  );
}

/** Wide banner picker. Falls back to the supplied gradient when empty. */
export function CoverPicker({
  value, fallbackGradient, onChange,
}: {
  value: string | null;
  fallbackGradient: string;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const crop = useCropFlow((url) => onChange(url));
  const [confirming, setConfirming] = useState(false);
  const busy = crop.busy;
  const choose = () => input.current?.click();

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium">Cover photo</p>
        <span className="text-xs text-ink-faint">recommended 1600 × 400</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl ring-1 ring-inset ring-line-soft">
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          aria-label={value ? 'Replace cover photo' : 'Upload a cover photo'}
          className="block aspect-[4/1] w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="block h-full w-full" style={{ backgroundImage: fallbackGradient }} />
          )}

          {/* Keeps the controls readable whatever the photo is doing up there. */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />

          {busy ? (
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
              <Spinner className="h-6 w-6" />
            </span>
          ) : !value && (
            <span className="absolute inset-0 grid place-items-center text-white">
              <span className="flex items-center gap-2 text-[13px] font-medium drop-shadow">
                <Icon name="camera" size={18} /> Add a cover
              </span>
            </span>
          )}
        </button>

        <div className="absolute right-2 top-2 flex gap-1.5">
          <ImageAction icon="camera" label={value ? 'Replace cover' : 'Upload a cover'} onClick={choose} disabled={busy} />
          {value && !busy && (
            <ImageAction icon="trash" label="Remove cover" tone="danger" onClick={() => setConfirming(true)} />
          )}
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          crop.pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {crop.pending && (
        <ImageCropper
          file={crop.pending}
          aspect={4}
          outputWidth={1600}
          title="Adjust cover photo"
          onCancel={crop.cancel}
          onConfirm={crop.apply}
        />
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { onChange(null); setConfirming(false); }}
        title="Remove your cover photo?"
        body="Your profile falls back to its colour gradient. You can add another one at any time."
        confirmLabel="Remove"
      />
    </div>
  );
}
