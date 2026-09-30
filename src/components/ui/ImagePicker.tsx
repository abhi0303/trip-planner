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
 * A bare control that sits on the image it acts on.
 *
 * No chip, no filled circle: a pill behind every icon read as a stray UI part
 * dropped on the photo. The icon carries its own legibility through a shadow,
 * which holds over a bright sky as well as a dark street, and the tap target is
 * padding rather than anything you can see.
 */
function ImageAction({
  icon, label, onClick, disabled, size = 19, className,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-full text-white',
        '[filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.9))_drop-shadow(0_0_10px_rgb(0_0_0/0.45))]',
        'transition-transform duration-200 ease-spring hover:scale-110 active:scale-90',
        'outline-none focus-visible:ring-2 focus-visible:ring-white/90',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
    >
      <Icon name={icon} size={size} strokeWidth={2.1} />
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
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white">
              <Spinner className="h-5 w-5" />
            </span>
          )}
        </button>

        {/* Siblings of the button, not children — a button inside a button is
            invalid and the inner one stops working. */}
        {/* Both controls stay inside the circle. Outside it they would be white
            on a pale card, which in light mode is nothing at all. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 rounded-b-full bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

        <span className="absolute inset-x-0 bottom-1 flex items-center justify-center">
          <ImageAction
            icon="camera"
            label={value ? 'Replace picture' : 'Upload a picture'}
            onClick={choose}
            disabled={busy}
            size={17}
            className="h-9 w-9"
          />
          {value && !busy && (
            <ImageAction
              icon="trash"
              label="Remove picture"
              onClick={() => setConfirming(true)}
              size={16}
              className="h-9 w-9"
            />
          )}
        </span>
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

        <div className="absolute right-1 top-1 flex">
          <ImageAction icon="camera" label={value ? 'Replace cover' : 'Upload a cover'} onClick={choose} disabled={busy} />
          {value && !busy && (
            <ImageAction icon="trash" label="Remove cover" onClick={() => setConfirming(true)} />
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
