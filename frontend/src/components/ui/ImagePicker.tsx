import { useRef, useState } from 'react';
import { mediaApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { Spinner } from './Button';
import { useToast } from './Toast';
import { ImageCropper } from './ImageCropper';

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

/** Circular avatar picker with the current image as its own preview. */
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
  const busy = crop.busy;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label="Change profile picture"
        className="group relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-brand"
        style={{ width: size, height: size }}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full gradient-brand text-xl font-semibold text-white">
            {fallback}
          </span>
        )}

        <span
          className={cn(
            'absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white',
            'opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
            busy && 'opacity-100',
          )}
        >
          {busy ? <Spinner className="h-5 w-5" /> : <Icon name="camera" size={20} />}
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-[13px] font-medium">Profile picture</p>
        <p className="mt-0.5 text-xs text-ink-faint">JPEG, PNG, WebP or HEIC · up to 10 MB</p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="text-[13px] font-medium text-brand hover:underline disabled:opacity-50"
          >
            {value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[13px] font-medium text-ink-faint hover:text-danger"
            >
              Remove
            </button>
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
          aspect={1}
          round
          outputWidth={512}
          title="Adjust profile picture"
          onCancel={crop.cancel}
          onConfirm={crop.apply}
        />
      )}
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
  const busy = crop.busy;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium">Cover photo</p>
        <span className="text-xs text-ink-faint">recommended 1600 × 400</span>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label="Change cover photo"
        className="group relative block aspect-[4/1] w-full overflow-hidden rounded-2xl ring-1 ring-inset ring-line-soft outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full" style={{ backgroundImage: fallbackGradient }} />
        )}

        <span
          className={cn(
            'absolute inset-0 grid place-items-center gap-1 bg-black/45 text-white',
            'opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
            busy && 'opacity-100',
          )}
        >
          {busy ? <Spinner className="h-6 w-6" /> : (
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <Icon name="camera" size={18} />
              {value ? 'Replace cover' : 'Upload a cover'}
            </span>
          )}
        </span>
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-[13px] font-medium text-ink-faint hover:text-danger"
        >
          Remove cover
        </button>
      )}

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
    </div>
  );
}
